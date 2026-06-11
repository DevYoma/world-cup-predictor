import { Elysia } from "elysia";
import { syncTeams, syncMatches } from "../../../lib/db/sync";
import { db } from "../../../lib/db";
import { matches, predictions, teams, users } from "../../../lib/db/schema";
import { getCurrentUserId, getOrCreateUser } from "../../../lib/auth";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

let isSyncingTeams = false;
let isSyncingMatches = false;

const homeTeams = alias(teams, "home_teams");
const awayTeams = alias(teams, "away_teams");

// Root Elysia app — all /api/* routes are handled here
const app = new Elysia({ prefix: "/api" })
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  
  // Temporary test endpoint for raw API inspection (can be removed later)
  .get("/test-football-data", async () => {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY || "",
      },
    });
    return await res.json();
  })

  // Get global leaderboard rankings (Top 100)
  .get("/leaderboard", async () => {
    const user = await getOrCreateUser();
    const currentUserId = user?.id || null;

    const rankings = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        totalPoints: users.totalPoints,
        predictionsCount: users.predictionsCount,
      })
      .from(users)
      .orderBy(
        desc(users.totalPoints),
        desc(sql`total_points::float / NULLIF(predictions_count, 0)`),
        asc(users.createdAt)
      )
      .limit(100);

    return {
      currentUserId,
      rankings,
    };
  })

  // Get current user stats and rank position for dashboard
  .get("/users/me/stats", async ({ set }) => {
    const user = await getOrCreateUser();
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const [userData] = await db
      .select({
        totalPoints: users.totalPoints,
        predictionsCount: users.predictionsCount,
        emailNotificationsEnabled: users.emailNotificationsEnabled,
      })
      .from(users)
      .where(eq(users.id, user.id));

    if (!userData) {
      set.status = 404;
      return { error: "User not found" };
    }

    const myAvg = userData.predictionsCount > 0 ? userData.totalPoints / userData.predictionsCount : 0;
    
    const [morePointsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`total_points > ${userData.totalPoints}`);

    const [samePointsHigherAvgResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.totalPoints, userData.totalPoints),
          sql`(total_points::float / NULLIF(predictions_count, 0)) > ${myAvg}`
        )
      );

    const [samePointsSameAvgEarlierResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.totalPoints, userData.totalPoints),
          sql`COALESCE(total_points::float / NULLIF(predictions_count, 0), 0) = ${myAvg}`,
          sql`created_at < ${user.createdAt}`
        )
      );

    const rank = 
      Number(morePointsResult?.count || 0) + 
      Number(samePointsHigherAvgResult?.count || 0) + 
      Number(samePointsSameAvgEarlierResult?.count || 0) + 
      1;

    return {
      totalPoints: userData.totalPoints,
      predictionsCount: userData.predictionsCount,
      emailNotificationsEnabled: userData.emailNotificationsEnabled,
      rank,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
    };
  })

  // Update user notification settings
  .patch("/users/me/settings", async ({ body, set }) => {
    const user = await getOrCreateUser();
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { emailNotificationsEnabled } = body as { emailNotificationsEnabled: boolean };
    if (emailNotificationsEnabled === undefined) {
      set.status = 400;
      return { error: "Missing emailNotificationsEnabled" };
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        emailNotificationsEnabled,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return { status: "success", user: updatedUser };
  })

  // Get matches list (with user predictions joined if logged in)
  .get("/matches", async () => {
    const user = await getOrCreateUser();
    const userId = user?.id || null;

    const results = await db
      .select({
        id: matches.id,
        apiMatchId: matches.apiMatchId,
        homeTeam: {
          id: homeTeams.id,
          name: homeTeams.name,
          shortName: homeTeams.shortName,
          flagUrl: homeTeams.flagUrl,
          groupName: homeTeams.groupName,
        },
        awayTeam: {
          id: awayTeams.id,
          name: awayTeams.name,
          shortName: awayTeams.shortName,
          flagUrl: awayTeams.flagUrl,
          groupName: awayTeams.groupName,
        },
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        kickoffAt: matches.kickoffAt,
        status: matches.status,
        prediction: {
          id: predictions.id,
          predictedHomeScore: predictions.predictedHomeScore,
          predictedAwayScore: predictions.predictedAwayScore,
          pointsAwarded: predictions.pointsAwarded,
          lockedAt: predictions.lockedAt,
        },
      })
      .from(matches)
      .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
      .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
      .leftJoin(
        predictions,
        and(
          eq(predictions.matchId, matches.id),
          eq(predictions.userId, userId || "")
        )
      )
      .orderBy(matches.kickoffAt);

    return results;
  })

  // Save/Edit predictions
  .post("/predictions", async ({ body, set }) => {
    const user = await getOrCreateUser();
    const userId = user?.id;
    if (!userId) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { matchId, homeScore, awayScore } = body as {
      matchId: number;
      homeScore: number;
      awayScore: number;
    };

    if (matchId === undefined || homeScore === undefined || awayScore === undefined) {
      set.status = 400;
      return { error: "Missing required fields" };
    }

    try {
      // 1. Fetch match to check kickoff lock
      const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
      if (!match) {
        set.status = 404;
        return { error: "Match not found" };
      }

      // 2. Lock prediction if match already kicked off
      if (new Date(match.kickoffAt) <= new Date()) {
        set.status = 400;
        return { error: "Match has already kicked off. Prediction locked." };
      }

      // 3. Upsert prediction for the (userId, matchId)
      const [prediction] = await db.insert(predictions)
        .values({
          userId,
          matchId,
          predictedHomeScore: homeScore,
          predictedAwayScore: awayScore,
        })
        .onConflictDoUpdate({
          target: [predictions.userId, predictions.matchId],
          set: {
            predictedHomeScore: homeScore,
            predictedAwayScore: awayScore,
            updatedAt: new Date(),
          },
        })
        .returning();

      return { status: "success", prediction };
    } catch (err: any) {
      set.status = 500;
      return { error: err.message || "Failed to save prediction" };
    }
  })

  // Sync teams route
  .post("/sync/teams", async ({ request, set }) => {
    const authHeader = request.headers.get("x-sync-secret");
    const secret = process.env.SYNC_SECRET;

    if (!secret || authHeader !== secret) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (isSyncingTeams) {
      set.status = 429;
      return { error: "Team sync already in progress" };
    }

    try {
      isSyncingTeams = true;
      const result = await syncTeams();
      return result;
    } catch (err: any) {
      set.status = 500;
      return { error: err.message || "Failed to sync teams" };
    } finally {
      isSyncingTeams = false;
    }
  })

  // Sync matches route
  .post("/sync/matches", async ({ request, set }) => {
    const authHeader = request.headers.get("x-sync-secret");
    const secret = process.env.SYNC_SECRET;

    const isSecretValid = secret && authHeader === secret;
    let isAdmin = false;

    if (!isSecretValid) {
      const user = await getOrCreateUser();
      if (user && user.email === "lawrenceyoma@gmail.com") {
        isAdmin = true;
      }
    }

    if (!isSecretValid && !isAdmin) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (isSyncingMatches) {
      set.status = 429;
      return { error: "Match sync already in progress" };
    }

    try {
      isSyncingMatches = true;
      const result = await syncMatches();
      return result;
    } catch (err: any) {
      set.status = 500;
      return { error: err.message || "Failed to sync matches" };
    } finally {
      isSyncingMatches = false;
    }
  });

export const GET = app.handle;
export const POST = app.handle;
export const PUT = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
