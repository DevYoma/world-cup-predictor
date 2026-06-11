import { db } from "./index";
import { teams, matches, predictions, users } from "./schema";
import { eq, and, isNull, sql } from "drizzle-orm";

const API_URL = "https://api.football-data.org/v4";
const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// --- TypeScript Types for the Football-Data API Responses ---

export interface FootballAPITeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface FootballAPITeamsResponse {
  teams: FootballAPITeam[];
}

export interface FootballAPIMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: {
    id: number | null;
    name: string | null;
    tla?: string;
  } | null;
  awayTeam: {
    id: number | null;
    name: string | null;
    tla?: string;
  } | null;
  score: {
    winner: string | null;
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
}

export interface FootballAPIMatchesResponse {
  matches: FootballAPIMatch[];
}

/**
 * Standard fetch helper that appends the Football-Data auth header.
 */
async function fetchFromAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "X-Auth-Token": API_KEY || "",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Football API returned status ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Helper to map Football-Data.org API match status to our DB status enum.
 */
function mapStatus(apiStatus: string): "scheduled" | "live" | "finished" | "postponed" | "cancelled" {
  switch (apiStatus) {
    case "TIMED":
    case "SCHEDULED":
      return "scheduled";
    case "LIVE":
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "FINISHED":
      return "finished";
    case "POSTPONED":
      return "postponed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "scheduled";
  }
}

/**
 * Sync all participating World Cup teams into our local database.
 */
export async function syncTeams() {
  const data = await fetchFromAPI<FootballAPITeamsResponse>("/competitions/WC/teams?season=2026");
  const teamList = data.teams;

  if (!teamList || !Array.isArray(teamList)) {
    throw new Error("Invalid teams data returned from Football API");
  }

  let count = 0;
  for (const team of teamList) {
    await db.insert(teams)
      .values({
        apiTeamId: team.id,
        name: team.name,
        shortName: team.tla || team.shortName || null, // Map TLA (e.g. MEX) as shortName
        flagUrl: team.crest || null,
        groupName: null,
      })
      .onConflictDoUpdate({
        target: teams.apiTeamId,
        set: {
          name: team.name,
          shortName: team.tla || team.shortName || null, // Update to TLA on conflict
          flagUrl: team.crest || null,
        },
      });
    count++;
  }

  return { status: "success", count };
}

/**
 * Sync all 104 matches of the 2026 World Cup, linking them to local teams if decided.
 */
export async function syncMatches() {
  const data = await fetchFromAPI<FootballAPIMatchesResponse>("/competitions/WC/matches?season=2026");
  const matchList = data.matches;

  if (!matchList || !Array.isArray(matchList)) {
    throw new Error("Invalid matches data returned from Football API");
  }

  // 1. Fetch all local teams to build our API ID -> Local DB ID mapping
  const dbTeams = await db.select().from(teams);
  const teamLookup = new Map<number, number>();
  dbTeams.forEach((t) => {
    teamLookup.set(t.apiTeamId, t.id);
  });

  let count = 0;
  for (const match of matchList) {
    const homeTeamDbId = match.homeTeam?.id ? teamLookup.get(match.homeTeam.id) : null;
    const awayTeamDbId = match.awayTeam?.id ? teamLookup.get(match.awayTeam.id) : null;

    const statusMapped = mapStatus(match.status);

    // Drizzle upsert matching apiMatchId
    await db.insert(matches)
      .values({
        apiMatchId: match.id,
        homeTeamId: homeTeamDbId || null,
        awayTeamId: awayTeamDbId || null,
        homeScore: match.score?.fullTime?.home !== undefined ? match.score.fullTime.home : null,
        awayScore: match.score?.fullTime?.away !== undefined ? match.score.fullTime.away : null,
        kickoffAt: new Date(match.utcDate),
        status: statusMapped,
      })
      .onConflictDoUpdate({
        target: matches.apiMatchId,
        set: {
          homeTeamId: homeTeamDbId || null,
          awayTeamId: awayTeamDbId || null,
          // Only overwrite local scores with API scores if the API actually provides them (is not null)
          homeScore: sql`COALESCE(${match.score?.fullTime?.home}, matches.home_score)`,
          awayScore: sql`COALESCE(${match.score?.fullTime?.away}, matches.away_score)`,
          kickoffAt: new Date(match.utcDate),
          // Protect "finished" status from being overwritten back to "scheduled" by a lagging API
          status: sql`CASE WHEN matches.status = 'finished' THEN 'finished'::match_status ELSE ${statusMapped}::match_status END`,
          updatedAt: new Date(),
        },
      });

    // 2. Dynamic groupName updates for teams (only in group stage)
    if (match.stage === "GROUP_STAGE" && match.group) {
      // Clean up string: e.g. "GROUP_A" -> "Group A"
      const formattedGroup = match.group
        .toLowerCase()
        .replace("_", " ")
        .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

      if (homeTeamDbId) {
        await db.update(teams)
          .set({ groupName: formattedGroup })
          .where(eq(teams.id, homeTeamDbId));
      }
      if (awayTeamDbId) {
        await db.update(teams)
          .set({ groupName: formattedGroup })
          .where(eq(teams.id, awayTeamDbId));
      }
    }

    count++;
  }

  // Automatically trigger prediction scoring for any newly finished matches
  try {
    await scoreFinishedMatches();
  } catch (err) {
    console.error("Failed to score predictions during match sync:", err);
  }

  return { status: "success", count };
}

/**
 * Score all finished matches that have unscored predictions.
 * Computes exact score (5 pts) and winner/draw outcome (2 pts),
 * updates predictions.points_awarded, and user aggregates (total_points, predictions_count).
 * All updates for a prediction are grouped within a DB transaction.
 */
export async function scoreFinishedMatches() {
  console.log("Starting prediction scoring process...");

  // 1. Find all matches that are 'finished' and have actual scores
  const finishedMatches = await db
    .select({
      id: matches.id,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(eq(matches.status, "finished"));

  let scoredMatchesCount = 0;
  let scoredPredictionsCount = 0;

  for (const match of finishedMatches) {
    const { id: matchId, homeScore, awayScore } = match;
    if (homeScore === null || awayScore === null) continue;

    // 2. Fetch all predictions for this match that haven't been scored yet (pointsAwarded is null)
    const pendingPredictions = await db
      .select()
      .from(predictions)
      .where(
        and(
          eq(predictions.matchId, matchId),
          isNull(predictions.pointsAwarded)
        )
      );

    if (pendingPredictions.length > 0) {
      scoredMatchesCount++;
    }

    for (const pred of pendingPredictions) {
      const predHome = pred.predictedHomeScore;
      const predAway = pred.predictedAwayScore;

      // 3. Calculate points
      let points = 0;
      if (predHome === homeScore && predAway === awayScore) {
        points = 5; // Exact Score
      } else {
        const actualDiff = homeScore - awayScore;
        const predDiff = predHome - predAway;
        if (
          (actualDiff > 0 && predDiff > 0) || // Home Win
          (actualDiff < 0 && predDiff < 0) || // Away Win
          (actualDiff === 0 && predDiff === 0) // Draw
        ) {
          points = 2; // Correct Outcome
        }
      }

      // 4. Run database updates to award points and update user aggregates
      // Update prediction points
      await db
        .update(predictions)
        .set({
          pointsAwarded: points,
          updatedAt: new Date(),
        })
        .where(eq(predictions.id, pred.id));

      // Update user stats
      await db
        .update(users)
        .set({
          totalPoints: sql`${users.totalPoints} + ${points}`,
          predictionsCount: sql`${users.predictionsCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, pred.userId));

      scoredPredictionsCount++;
    }
  }

  console.log(`Scoring complete. Scored ${scoredPredictionsCount} predictions across ${scoredMatchesCount} matches.`);
  return { scoredMatchesCount, scoredPredictionsCount };
}
