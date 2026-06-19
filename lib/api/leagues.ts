import { Elysia } from "elysia";
import { db } from "../db";
import { leagues, leagueMembers, users } from "../db/schema";
import { getOrCreateUser } from "../auth";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export const leaguesPlugin = new Elysia({ prefix: "/leagues" })

  // List all leagues the current user belongs to
  .get("/", async ({ set }) => {
    const user = await getOrCreateUser();
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const memberships = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        code: leagues.code,
        creatorId: leagues.creatorId,
        creatorName: users.displayName,
        createdAt: leagues.createdAt,
      })
      .from(leagueMembers)
      .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
      .leftJoin(users, eq(leagues.creatorId, users.id))
      .where(eq(leagueMembers.userId, user.id))
      .orderBy(desc(leagues.createdAt));

    return memberships;
  })

  // Create a new private league
  .post("/", async ({ body, set }) => {
    const user = await getOrCreateUser();
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { name } = body as { name: string };
    if (!name || name.trim().length === 0) {
      set.status = 400;
      return { error: "League name is required" };
    }

    // Check for duplicate name by this creator
    const [existingWithName] = await db
      .select({ id: leagues.id })
      .from(leagues)
      .where(and(eq(leagues.creatorId, user.id), eq(leagues.name, name.trim())))
      .limit(1);

    if (existingWithName) {
      set.status = 400;
      return { error: "You already created a league with this name. Please choose a different name." };
    }

    // Generate a unique WC-XXXX code
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
      let code = "WC-";
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    };

    let code = generateCode();
    // Retry on collision (extremely rare)
    const existing = await db.select().from(leagues).where(eq(leagues.code, code)).limit(1);
    if (existing.length > 0) code = generateCode();

    const [league] = await db.insert(leagues)
      .values({ name: name.trim(), code, creatorId: user.id })
      .returning();

    // Auto-add creator as a member
    await db.insert(leagueMembers)
      .values({ leagueId: league.id, userId: user.id });

    return { status: "success", league };
  })

  // Join a league by invite code
  .post("/join", async ({ body, set }) => {
    const user = await getOrCreateUser();
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { code } = body as { code: string };
    if (!code) {
      set.status = 400;
      return { error: "Invite code is required" };
    }

    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.code, code.trim().toUpperCase()))
      .limit(1);

    if (!league) {
      set.status = 404;
      return { error: "League not found. Double-check the invite code." };
    }

    // Check if already a member
    const [alreadyMember] = await db
      .select()
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, user.id)))
      .limit(1);

    if (alreadyMember) {
      // Already in — just return the league so the frontend can navigate there
      return { status: "already_member", league };
    }

    await db.insert(leagueMembers).values({ leagueId: league.id, userId: user.id });

    return { status: "success", league };
  })

  // Get private leaderboard for a specific league
  .get("/:id/leaderboard", async ({ params, set }) => {
    const user = await getOrCreateUser();
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { id } = params;

    // Verify league exists
    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    if (!league) {
      set.status = 404;
      return { error: "League not found" };
    }

    // Verify requesting user is a member
    const [membership] = await db
      .select()
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, id), eq(leagueMembers.userId, user.id)))
      .limit(1);

    if (!membership) {
      set.status = 403;
      return { error: "You are not a member of this league" };
    }

    // Fetch all members with their points (sourced from global user data — no separate league predictions)
    const members = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        totalPoints: users.totalPoints,
        predictionsCount: users.predictionsCount,
        joinedAt: leagueMembers.joinedAt,
      })
      .from(leagueMembers)
      .innerJoin(users, eq(leagueMembers.userId, users.id))
      .where(eq(leagueMembers.leagueId, id))
      .orderBy(
        desc(users.totalPoints),
        desc(sql`users.total_points::float / NULLIF(users.predictions_count, 0)`),
        asc(leagueMembers.joinedAt),
      );

    return { league, currentUserId: user.id, members };
  })

  // Delete a league — only the creator can do this
  .delete("/:id", async ({ params, set }) => {
    const user = await getOrCreateUser();
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { id } = params;

    // Verify league exists
    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    if (!league) {
      set.status = 404;
      return { error: "League not found" };
    }

    // Only the creator can delete
    if (league.creatorId !== user.id) {
      set.status = 403;
      return { error: "Only the league creator can delete this league" };
    }

    // Remove all members first (FK constraint), then delete the league
    await db.delete(leagueMembers).where(eq(leagueMembers.leagueId, id));
    await db.delete(leagues).where(eq(leagues.id, id));

    return { status: "success" };
  });
