# Development Roadmap

## Phase 1 - Project Setup ✅

- Setup Next.js (App Router, TypeScript, Tailwind v4)
- Setup Elysia (catch-all route: app/api/[[...slugs]]/route.ts)
- Setup Neon PostgreSQL
- Setup Drizzle ORM
- Setup Clerk Auth (Google OAuth)
- Setup React Query
- Setup shadcn/ui
- Font: Space Grotesk

## Phase 2 - Database ✅

- [x] Create users table
- [x] Create teams table
- [x] Create matches table
- [x] Create predictions table
- [x] Run migrations on Neon

## Phase 3 - Football Data Integration ✅

- [x] Connect Football-Data.org API
- [x] Create sync jobs (fixtures, scores, status)
- [x] Store fixtures in matches table
- [x] Store teams in teams table
- [x] Handle match updates (upsert by api_match_id)

## Phase 4 - Predictions ✅

- [x] Match listing page
- [x] Prediction form
- [x] Edit predictions
- [x] Lock predictions at kickoff (server-side enforced)

## Phase 5 - Scoring Engine ✅

- [x] Exact score logic (5 pts)
- [x] Winner/draw logic (2 pts)
- [x] Award points in DB transaction
- [x] Update users aggregates (total_points, predictions_count)

## Phase 6 - Leaderboard ✅

- [x] Ranking query (total_points DESC, avg DESC, created_at ASC)
- [x] User rank display
- [x] Average points per prediction

## Phase 7 - Profiles & Dashboard Consolidation ✅

- [x] Merge prediction history into Dashboard
- [x] Delete /profile page and clean up routes
- [x] Move Scoring system card up on Dashboard page layout
- [x] Wrap Predictions History in a distinct, scrollable parent container

## Phase 8 - Emails (Upcoming)

- [ ] Brevo integration
- [ ] Daily reminder emails
- [ ] Unsubscribe flow

## Phase 9 - Design & Settings Restored ✅

- [x] Landing page design
- [x] Dashboard page layout consolidation
- [x] Leaderboard page card layout list
- [x] Restored Settings page (with dirty-check Save button)
- [x] Header Navigation Active Link Highlight

## Phase 10 - Deployment

- [ ] Production environment (Vercel)
- [ ] Vercel Cron jobs (sync + email)
- [ ] Monitoring
- [ ] Launch
