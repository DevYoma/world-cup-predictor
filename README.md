# World Cup Predictor

A high-performance, real-time football prediction platform built for global tournaments, designed to deliver type-safe, low-latency prediction workflows and private competitive leagues.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-green?style=flat-square&logo=postgresql)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?style=flat-square&logo=postgresql)](https://neon.tech/)
[![Authentication](https://img.shields.io/badge/Auth-Clerk-purple?style=flat-square&logo=clerk)](https://clerk.com/)
[![Elysia.js](https://img.shields.io/badge/Elysia.js-1.4-cyan?style=flat-square)](https://elysiajs.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 🔗 Demo
*   **Live Demo**: [world-cup-predictor-taupe.vercel.app](https://world-cup-predictor-taupe.vercel.app) *(Deploy link placeholder)*
*   **Source Code**: [github.com/DevYoma/world-cup-predictor](https://github.com/DevYoma/world-cup-predictor)

*(Insert Demo Video / Walkthrough GIF Here)*

---

## 📖 Overview

### The Problem
During massive international sports tournaments like the FIFA World Cup, fans seek to engage beyond just watching. Traditional bracket challenges are often static, tedious to manage, and suffer from poor mobile responsiveness. Moreover, building real-time prediction apps presents structural challenges at scale: handling high-concurrency traffic around kickoffs, managing synchronization across live external score feeds, dynamically resolving bracket progressions (e.g. knockout stages where opponents are originally "To Be Decided"), and recalculating points accurately across thousands of users simultaneously.

### The Solution
**World Cup Predictor** is a production-grade, full-stack platform built specifically to address these challenges. It allows football fans to easily register, submit predictions for upcoming matches, track live scores, and compete in both global and private leaderboards. The platform is optimized for sub-100ms API responses, clean type-safety, and seamless updates, ensuring a reliable developer and user experience throughout the high-intensity tournament lifecycle.

---

## ⚡ Features

*   **🔒 Secure Authentication & Sync**: Managed by Clerk (OAuth & Email/Password), integrated into our Postgres database via dynamic server-side profiles and webhook sync.
*   **⚽ Lock-on-Kickoff Predictions**: Flexible inline forms allowing authenticated and anonymous users (limited to next 3 matches) to predict scores, with automatic validation locking exactly at kickoff.
*   **🏆 Dual Leaderboard System**: Comprises a global rankings leaderboard and customizable private leagues with unique invite codes (e.g. `WC-A7B8`) to compete directly with friends.
*   **🔄 External API Feeds Integration**: Sync job scripts that periodically poll external data providers (Football-Data.org) to update fixture statuses, scores, and qualified teams.
*   **📬 Dynamic Reminders**: Background jobs that fetch pending predictions for matches starting in the next 24 hours and send reminders via Brevo using template-driven `React Email` markup.
*   **⚡ Type-Safe REST Layer**: Elysia.js router embedded directly into Next.js App Router API directory, providing validation constraints and shared TypeScript types.
*   **📱 Rich Dark-Mode UI**: Built with Tailwind CSS and Shadcn/UI for a premium, clean, dark-mode design fully optimized for mobile devices.

---

## 🛠️ Tech Stack Table

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Next.js (v15 App Router) | Selected for its routing flexibility, hybrid server/client execution model, and image optimization assets. |
| **Backend** | Elysia.js | Handles backend routing. Runs as a high-performance, single-instance router mounted to Next.js API catch-all handlers. |
| **Database** | Neon Serverless PostgreSQL | Serverless Postgres database allowing automatic scale-to-zero compute and database pooling over HTTP. |
| **Authentication** | Clerk Auth | Provides reliable user session management, Google OAuth flow, and webhook-driven profile sync. |
| **ORM** | Drizzle ORM | TypeScript-first ORM providing SQL-like queries, migrations generation, and strong type safety. |
| **Styling** | Tailwind CSS (v4) | Fast, utility-first CSS styling that avoids bloating bundle size while providing cohesive color spacing. |
| **Email Service** | Brevo & React Email | Dynamic HTML email template compilation inside React, sent using Brevo's REST SMTP API. |
| **State & Fetching** | TanStack React Query | Manages query caching, mutation states, browser invalidation triggers, and offline prediction sync. |

---

## 📐 Project Architecture

The application is structured to isolate business operations from the client visual layer. The Elysia.js API router handles all data mutations, which guarantees that the client application never interacts with external data feeds or the database directly.

### Data & Request Flow
```mermaid
graph TD
    Client[Next.js App / React Client] -->|Fetch Requests /api/*| Elysia[Elysia.js API Route Handler]
    Elysia -->|Drizzle ORM Queries| Neon[Neon Serverless PostgreSQL]
    Clerk[Clerk Auth Services] <-->|Authentication JWT| Client
    Clerk -->|Webhook Sync| Elysia
    Elysia -->|Trigger Emails| Brevo[Brevo SMTP / REST API]
    API[Football-Data.org API] -->|Sync Cron Job /api/sync/*| Elysia
```

### Key Request Flows
1.  **Auth Sync**: On user sign-in/up, Clerk verifies credentials and fires a webhook. Elysia handles the webhook to insert the user profile into the Postgres `users` table.
2.  **Match Prediction**: The user updates a score input. A TanStack Query mutation calls `/api/predictions`. Elysia verifies that the match kickoff date has not passed and updates the prediction.
3.  **Automatic Scoring**: A cron job triggers the `/api/sync/matches` endpoint. Elysia fetches updated match data from Football-Data.org, updates local scores, checks for finished matches, and allocates points:
    *   **5 points**: Exact score match.
    *   **2 points**: Correct outcome (Win/Loss/Draw) but incorrect score.
    *   **0 points**: Incorrect outcome.

---

## 🗄️ Database Design

The database schema is modeled to represent relational connections with performance indexes on query filters (like match status and kickoff times).

### Entity Relationship Diagram
```mermaid
erDiagram
    users {
        text id PK "Clerk User ID"
        text email
        text displayName
        text avatarUrl
        integer totalPoints
        integer predictionsCount
        boolean emailNotificationsEnabled
        boolean showOnGlobalLeaderboard
        timestamp unsubscribedAt
        timestamp createdAt
        timestamp updatedAt
    }
    teams {
        serial id PK
        integer apiTeamId
        text name
        text shortName
        text flagUrl
        text groupName
        timestamp createdAt
    }
    matches {
        serial id PK
        integer apiMatchId
        integer homeTeamId FK
        integer awayTeamId FK
        integer homeScore
        integer awayScore
        timestamp kickoffAt
        match_status status
        timestamp createdAt
        timestamp updatedAt
    }
    predictions {
        serial id PK
        text userId FK
        integer matchId FK
        integer predictedHomeScore
        integer predictedAwayScore
        integer pointsAwarded
        timestamp lockedAt
        timestamp createdAt
        timestamp updatedAt
    }
    leagues {
        uuid id PK
        text name
        varchar code
        text creatorId FK
        timestamp createdAt
    }
    leagueMembers {
        uuid id PK
        uuid leagueId FK
        text userId FK
        timestamp joinedAt
    }

    users ||--o{ predictions : "makes"
    users ||--o{ leagues : "creates"
    users ||--o{ leagueMembers : "joins"
    leagues ||--o{ leagueMembers : "has"
    teams ||--o{ matches : "plays as home"
    teams ||--o{ matches : "plays as away"
    matches ||--o{ predictions : "receives"
```

### Design Notes:
*   **Nullable Knockouts**: `homeTeamId` and `awayTeamId` in the `matches` table are nullable. This is essential for knockout rounds (e.g. Round of 32) where team slots are created before the playing teams are decided.
*   **Index Optimizations**: Indexes are placed on `matches.kickoff_at` and `matches.status` to ensure fast query sorting. A composite unique index on `predictions(user_id, match_id)` prevents users from inserting duplicate predictions for a single match.

---

## 🔒 Authentication & Authorization

All secure endpoints undergo authorization checks.
1.  **Session Verification**: The `lib/auth/index.ts` helper reads the active Clerk JWT from the incoming request context.
2.  **Elysia Middleware Authorization**: Endpoints like `/api/predictions` and `/api/leagues` run an authorization check. If the Clerk session is invalid or missing, the route returns a `401 Unauthorized` response immediately.
3.  **Cron/Sync Authentication**: Public sync routes like `/api/sync/matches` require a secret request header (`x-sync-secret`) matching `process.env.SYNC_SECRET` to prevent unauthorized execution.

---

## 📂 Folder Structure

```tree
├── app/                  # Next.js App Router (pages and api wrappers)
│   ├── api/              # API Route directory (Elysia mounted here)
│   ├── dashboard/        # Dashboard layout and page
│   ├── leaderboard/      # Global leaderboard UI page
│   ├── leagues/          # Private competitive leagues UI pages
│   ├── matches/          # Fixtures list and inline prediction fields
│   ├── settings/         # User profile privacy and email notification toggles
│   ├── providers.tsx     # TanStack Query & React Context providers
│   └── globals.css       # Custom styling configurations
├── components/           # Reusable UI component blocks (Header, MatchList, etc.)
├── drizzle/              # Drizzle ORM migrations and snapshot logs
├── lib/                  # Backend modules, schemas, database helpers
│   ├── api/              # Elysia plugins (leagues, stats)
│   ├── auth/             # Clerk auth helpers and sync checks
│   ├── db/               # Drizzle schemas, index, and match sync scripts
│   └── email.tsx         # Brevo SMTP handler & React Email layouts
├── public/               # Static assets (images, logos)
└── scratch/              # Temporary test scripts
```

---

## 📖 Lessons Learned

Building this application demonstrated the importance of:
*   **Type Safety Cohesion**: Sharing type interfaces between Elysia, Drizzle database entities, and the React frontend eliminates entire categories of runtime serialization bugs.
*   **Stateless Scaling**: Embedding backend routers like Elysia inside serverless edge routes allows the application to handle high request concurrency around match kickoff events without requiring dedicated server maintenance.

---

## 🚀 Future Roadmap

This project is evolving into a complete football prediction platform focused on the **English Premier League (EPL)**, including:
*   Support for English Premier League fixtures.
*   Live fixtures and real-time standings.
*   Weekly match predictions and analytics.
*   Detailed team pages, player statistics, and match statistics.
*   **Real-time Score Synchronization**: Implementing WebSockets to push immediate scoreboard updates upon match completion, bypassing latency limitations of the freemium API tier.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request with details on your proposed changes.

---

## 📄 License
Distributed under the MIT License. See [LICENSE](LICENSE) for more details.

---

## 💖 Acknowledgements
*   [Football-Data.org API](https://www.football-data.org/) for the tournament data feed.
*   [Next.js documentation](https://nextjs.org/docs) for the routing model.
*   [Shadcn/UI](https://ui.shadcn.com/) for the premium styling assets.
