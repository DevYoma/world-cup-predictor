# AGENTS.md

## Project Context

This project is a FIFA World Cup Predictor web application.

Users can predict football match scores before kickoff, earn points based on prediction accuracy, and compete on a global leaderboard.

The application is designed to feel premium, competitive, and highly engaging during the World Cup tournament.

The project follows a simple MVP-first approach.

## Existing Documentation

Before making architectural decisions, always read:

* PROJECT_SPEC.md
* DB_SCHEMA.md
* BUSINESS_LOGIC.md
* TASKS.md

These files are the source of truth.

Do not introduce functionality that conflicts with those documents.

## Tech Stack

Frontend:

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack React Query

Backend:

* Elysia
* Drizzle ORM

Database:

* Neon PostgreSQL (serverless)

Authentication:

* Clerk (Google OAuth)

Email:

* Brevo

External Data:

* Football-Data.org API

Hosting:

* Vercel

## Architecture Principles

* Simplicity over abstraction.
* Avoid unnecessary layers.
* Do not create service, transformer, repository, or factory patterns unless duplication appears.
* Keep code readable and colocated.
* Favor composition over premature architecture.

## Data Flow

Football API
→ Sync Jobs
→ Database

Database
→ Elysia API

Elysia API
→ React Query

React Query
→ UI

The frontend must never call Football-Data.org directly.

## Auth Flow

Clerk handles session management.

On sign-in/sign-up:
→ Clerk webhook fires
→ User upserted into our users table
→ Clerk userId stored as users.id

## Coding Principles

* Strong TypeScript typing.
* Server-side validation.
* Keep business logic out of components.
* Prefer explicit code over clever code.
* Optimize for maintainability.

## Product Principles

The application is primarily a prediction game.

Prioritize:

1. Predictions
2. Leaderboard
3. User engagement
4. Tournament experience

Avoid scope creep.

Non-MVP features should not be implemented unless explicitly requested.

## Tournament Rules

Before tournament:

* Countdown to World Cup start.

During tournament:

* Countdown to World Cup end.

After tournament:

* Archive mode.
* Read-only experience.
* Historical rankings and predictions remain available.

## Goal

Build a polished, production-quality World Cup prediction platform that can handle real users during the tournament while remaining simple and maintainable.
