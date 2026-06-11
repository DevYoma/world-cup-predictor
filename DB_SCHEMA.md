# Database Schema

## users

Purpose:
Store user identity, ranking data, and notification preferences.

Columns:
- id
- email
- display_name
- avatar_url
- total_points
- predictions_count
- email_notifications_enabled
- unsubscribed_at
- created_at
- updated_at

## teams

Purpose:
Normalized team information.

Columns:
- id
- api_team_id
- name
- short_name
- flag_url
- group_name
- created_at

## matches

Purpose:
Source of truth for tournament fixtures and results.

Columns:
- id
- api_match_id
- home_team_id
- away_team_id
- home_score
- away_score
- kickoff_at
- status
- created_at
- updated_at

Status Enum:
- scheduled
- live
- finished
- postponed
- cancelled

## predictions

Purpose:
Stores user predictions and awarded points.

Columns:
- id
- user_id
- match_id
- predicted_home_score
- predicted_away_score
- points_awarded
- locked_at
- created_at
- updated_at

## Relationships

users
  -> predictions

matches
  -> predictions

teams
  -> matches.home_team_id

teams
  -> matches.away_team_id

## Indexes

users:
- total_points

matches:
- kickoff_at
- status
- api_match_id

predictions:
- user_id
- match_id
- unique(user_id, match_id)
