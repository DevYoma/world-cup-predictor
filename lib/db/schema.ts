import { pgTable, text, integer, boolean, timestamp, serial, index, uniqueIndex, pgEnum, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Enums
export const matchStatus = pgEnum("match_status", ["scheduled", "live", "finished", "postponed", "cancelled"]);

// 2. Users Table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk User ID
  email: text("email").unique().notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  totalPoints: integer("total_points").default(0).notNull(),
  predictionsCount: integer("predictions_count").default(0).notNull(),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true).notNull(),
  showOnGlobalLeaderboard: boolean("show_on_global_leaderboard").default(true).notNull(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("users_total_points_idx").on(table.totalPoints),
]);

// 3. Teams Table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  apiTeamId: integer("api_team_id").unique().notNull(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  flagUrl: text("flag_url"),
  groupName: text("group_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Matches Table
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  apiMatchId: integer("api_match_id").unique().notNull(),
  homeTeamId: integer("home_team_id").references(() => teams.id), // Nullable for upcoming knockout stages
  awayTeamId: integer("away_team_id").references(() => teams.id), // Nullable for upcoming knockout stages
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  status: matchStatus("status").default("scheduled").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("matches_kickoff_at_idx").on(table.kickoffAt),
  index("matches_status_idx").on(table.status),
]);

// 5. Predictions Table
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  matchId: integer("match_id").references(() => matches.id).notNull(),
  predictedHomeScore: integer("predicted_home_score").notNull(),
  predictedAwayScore: integer("predicted_away_score").notNull(),
  pointsAwarded: integer("points_awarded"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("predictions_user_id_idx").on(table.userId),
  index("predictions_match_id_idx").on(table.matchId),
  uniqueIndex("predictions_user_id_match_id_unique").on(table.userId, table.matchId),
]);

// 6. Leagues Table
export const leagues = pgTable("leagues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 8 }).unique().notNull(), // e.g. "WC-A7B8"
  creatorId: text("creator_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. League Members Table
export const leagueMembers = pgTable("league_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Prevent a user from joining the same league twice
  uniqueIndex("league_members_league_id_user_id_unique").on(table.leagueId, table.userId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  predictions: many(predictions),
  leagueMembers: many(leagueMembers),
  createdLeagues: many(leagues, { relationName: "createdLeagues" }),
}));

export const leaguesRelations = relations(leagues, ({ one, many }) => ({
  creator: one(users, {
    fields: [leagues.creatorId],
    references: [users.id],
    relationName: "createdLeagues",
  }),
  members: many(leagueMembers),
}));

export const leagueMembersRelations = relations(leagueMembers, ({ one }) => ({
  league: one(leagues, {
    fields: [leagueMembers.leagueId],
    references: [leagues.id],
  }),
  user: one(users, {
    fields: [leagueMembers.userId],
    references: [users.id],
  }),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  homeMatches: many(matches, { relationName: "homeMatches" }),
  awayMatches: many(matches, { relationName: "awayMatches" }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: "homeMatches",
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: "awayMatches",
  }),
  predictions: many(predictions),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(users, {
    fields: [predictions.userId],
    references: [users.id],
  }),
  match: one(matches, {
    fields: [predictions.matchId],
    references: [matches.id],
  }),
}));
