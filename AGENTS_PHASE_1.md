# Private Leagues (Phase 1) - Specification & Roadmap

## Product Goal
Build a free, polished, and privacy-conscious private leagues feature for the World Cup Predictor. Users can create private prediction pools, invite friends via a code, and compete on a private leaderboard — all using the same global predictions everyone else is making.

---

## Important Clarification — Predictions Are Global
> Predictions are **NOT** separate or private per league.
> Every user predicts match scores the same way they always have (on the global `/predictions` flow).
> Private leagues simply **filter the global leaderboard** to show only that league's members,
> ranked by the same `total_points` / `average_points` they've already earned globally.
> There is no separate prediction form for private leagues.

---

## Minimum Requirements

### 1. Private Leagues (Bragging Rights Only)
* **Creation:** Any registered user can create a private league by giving it a name.
* **Invite Codes:** Every league generates a unique, user-friendly 6-character code (e.g. `WC-ABCD`).
* **Joining:** Users can enter a code to join a league (must be signed in).
* **Leaderboards:** A private leaderboard showing rankings and points of **only that league's members** — pulled from their existing global prediction data.

### 2. Global Leaderboard Privacy Toggle
* **Settings Toggle:** A new toggle in the User Settings page: *"Show my name on the global leaderboard"*.
* **Behavior:** When disabled, the user is excluded from the global leaderboard ranking list. However, they remain fully active and visible in their private leagues.

---

## ⏸️ PENDING — Seamless Sign-Up & Auto-Join Flow
> This feature is **deferred to a later phase**. Do not build it now.
> Focus first on getting the core private leagues feature working for signed-in users.

When we come back to this, here's what needs to be built:

* **Invite Link:** The creator shares a custom invite link: `/join/[code]`.
* **Anonymous Redirect:** If an unregistered/logged-out user visits this link:
  1. The app saves the league code (e.g. `WC-ABCD`) to their browser's cookies or `localStorage`.
  2. The user is redirected to Clerk Sign-Up.
* **Auto-Join Callback:** After a successful signup, Clerk redirects the user to `/join-success`. This page reads the saved code, calls the backend to join the user to the league, clears the browser storage, and redirects them to the private league's dashboard.

---

## Technical Architecture

### 1. Database Schema updates

We need to add two new tables and one new column to the schema:

#### Column addition:
* `users.show_on_global_leaderboard` (boolean, default: `true`)

#### New Tables:
```typescript
// 1. leagues table
export const leagues = pgTable("leagues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 8 }).unique().notNull(), // e.g. "WC-A7B8"
  creatorId: text("creator_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. league_members table
export const leagueMembers = pgTable("league_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id").references(() => leagues.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});
```

### 2. Elysia Backend API Endpoints (`/app/api/[[...slugs]]/route.ts`)

#### ✅ Build Now:
1. `POST /api/leagues`
   * **Purpose:** Create a new league. Generates a random 6-character code, inserts the league row, and adds the creator to the `league_members` table.
2. `POST /api/leagues/join`
   * **Purpose:** Join a league using a code. Validates if the code exists and if the user is already a member before inserting. **Requires the user to be signed in.**
3. `GET /api/leagues`
   * **Purpose:** List all leagues the current user is a member of.
4. `GET /api/leagues/:id/leaderboard`
   * **Purpose:** Returns the private leaderboard for a specific league ID — queries existing user `total_points` / `average_points`, filtered to league members only. Sorted by `total_points` DESC, `average_points` DESC, `created_at` ASC.
5. `PATCH /api/users/privacy`
   * **Purpose:** Updates `show_on_global_leaderboard` for the current user.

#### ⏸️ PENDING (for Seamless Sign-Up & Auto-Join Flow):
* `GET /api/leagues/resolve/:code` — Resolves a league code for the `/join/[code]` invite handler page.

### 3. Frontend Pages to Create

#### ✅ Build Now:
1. **Leagues page (`/leagues`):**
   * List of leagues the current user has joined.
   * "Create League" modal/card (simple form: League Name).
   * "Join League" modal/card (simple form: Invite Code — must be signed in).
2. **Private Leaderboard page (`/leagues/[id]`):**
   * Shows league name and invite code.
   * Share button (copies the invite code to clipboard for others to enter manually).
   * Table displaying members: Rank, Display Name, Predictions Count, Total Points, Average Points.
   * All data comes from the existing global predictions — no separate league predictions.

#### ⏸️ PENDING (for Seamless Sign-Up & Auto-Join Flow):
3. **Invite handler route (`/join/[code]`):**
   * A Next.js server component or middleware that checks auth.
   * If logged in, auto-joins the league and redirects to `/leagues/[id]`.
   * If logged out, sets cookie with the code and redirects to `/sign-up?redirect_url=/join-success`.
4. **Onboarding callback route (`/join-success`):**
   * Client-side page that reads the stored cookie/localStorage code, fires the API request to join, and takes the user to the private league dashboard.

---

## Coding Rules & UX Details
* **Premium Design:** Keep the private leaderboard dark and premium, matching the Space Grotesk fonts and HSL tailored colors of the main dashboard.
* **No Scope Creep:** Do not add payments or buy-in forms during this phase. Focus exclusively on the free version.
* **Simplicity:** Write explicit code, avoid heavy abstraction layers, and leverage React Query for data fetching.
* **Predictions are global:** Never create a separate prediction flow for private leagues. Query existing user data only.
