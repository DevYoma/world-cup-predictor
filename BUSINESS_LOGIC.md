# Business Logic

## Prediction Lifecycle

OPEN
-> User creates prediction
-> User edits prediction
-> Kickoff occurs
-> Prediction LOCKED
-> Match FINISHED
-> Prediction SCORED

## Locking Rules

Prediction is editable until:

match.kickoff_at <= now()

After kickoff:
- No edits
- No deletion
- No creation

## Scoring Rules

Actual Score: 2-1

Prediction: 2-1
Points: 5

Prediction: 1-0
Points: 2

Prediction: 1-1
Points: 0

### Exact Score
5 points

### Correct Winner/Draw
2 points

### Incorrect
0 points

## User Aggregates

When points are awarded:

- update predictions.points_awarded
- update users.total_points
- update users.predictions_count

Both updates must occur inside a database transaction.

## Leaderboard Ranking

Order By:

1. total_points DESC
2. average_points_per_prediction DESC
3. account creation date ASC

Average Points Per Prediction:

total_points / predictions_count

## Match Syncing

Source of Truth:
Football-Data API

Cron Job:
- Sync fixtures
- Sync kickoff changes
- Sync match status
- Sync final scores

## Email Reminders

Daily Job:

For each user:
- notifications enabled
- upcoming unlocked matches exist
- prediction missing

Send reminder email.

## Tournament Rules

Before Tournament:
- Countdown to start

During Tournament:
- Countdown to end

After Tournament:
- Archive mode
- Read-only experience
