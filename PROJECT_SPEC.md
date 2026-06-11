# World Cup Predictor - Project Specification

## Product Vision
A FIFA World Cup prediction platform where users predict match scores, earn points, compete on a global leaderboard, and receive reminder emails for upcoming matches.

## MVP Goals
- Predict match scores
- Automatic scoring after matches finish
- Global leaderboard
- User profiles
- Google authentication via Clerk
- Reminder emails
- Responsive web experience

## Core Features
### Authentication
- Google Sign In via Clerk
- Anonymous users may make up to 3 predictions (stored in localStorage) before sign-in is required

### Predictions
- Users can predict any future match
- Predictions remain editable until kickoff
- Predictions lock automatically at kickoff

### Scoring
- Exact Score = 5 points
- Correct Winner/Draw = 2 points
- Incorrect Prediction = 0 points

### Leaderboard
- Global ranking
- Total points
- Average points per prediction
- User rank visibility

### Emails
- Daily reminder emails via Brevo
- Unsubscribe support
- Only email users with upcoming matches not yet predicted

## Tournament Lifecycle
### Before Start
- Countdown to World Cup start

### During Tournament
- Countdown to World Cup end
- Live predictions
- Active leaderboard

### After Tournament
- Archive mode
- Read-only leaderboard
- Historical predictions
- Final rankings preserved

## Non-MVP
- Private leagues
- Paid pools
- Referrals
- AI predictions
- Match chat
- Push notifications
