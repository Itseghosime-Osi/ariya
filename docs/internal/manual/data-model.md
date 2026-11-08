# Data model

The tables, what they hold and the important database functions.

Audience: Developers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Tables

| Table                                                                         | Holds                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `profiles`                                                                    | A person's name and photo, linked to the auth user                                   |
| `events`                                                                      | A celebration, including `hall_layout` (≤ 64 KB JSON) and `invitation_design` (JSON) |
| `event_members`                                                               | Who has which role in an event                                                       |
| `event_invites`                                                               | Team invitation tokens (7-day expiry)                                                |
| `guests`                                                                      | Guest parties, party size, `check_in_code`, invited state, token                     |
| `rsvps`, `rsvp_answers`                                                       | A guest's reply and answers to the host's questions                                  |
| `tables`, `seat_assignments`                                                  | Banquet tables (positions in cm) and who sits where                                  |
| `check_ins`                                                                   | Door admissions with time                                                            |
| `vendors`, `vendor_tasks`                                                     | Vendor roster and dated tasks                                                        |
| `tasks`                                                                       | The generated checklist (unique `(event_id, source_key)`, tombstone deletes)         |
| `invoices`, `payments`                                                        | Celebration Pass billing                                                             |
| `email_log`                                                                   | Every email attempt and its outcome                                                  |
| `digest_log`                                                                  | One weekly digest per person per week                                                |
| `notification_preferences`, `push_subscriptions`                              | Notification settings and devices                                                    |
| `rate_limits`                                                                 | Counters behind the rate limiter                                                     |
| `ai_proposals`, `ai_activity_log`, `ai_connection_settings`, `ai_quota_usage` | The AI connection layer                                                              |

## Functions worth knowing

| Function                                             | Purpose                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `is_event_member`, `has_event_role`                  | Security-definer helpers used by RLS policies                |
| `hit_rate_limit`                                     | Atomic counter, service role only, prunes old rows           |
| `record_successful_payment`                          | Idempotent payment finalisation                              |
| `global_search`                                      | Events, guests and vendors the caller may see                |
| `search_check_in_guests`                             | Name search at the desk for staff and up                     |
| `get_invitation`, `get_check_in_code`, `submit_rsvp` | Guest-facing, token-limited (40 and 10 per minute per token) |
| `create_event`                                       | App-token-limited creation                                   |

## Triggers

- `tr_event_member_security`: no self-role changes, last owner protected.
- `tr_event_protection`: users cannot mark an event paid.
- `tr_guests_app_token_quota` and `tr_ai_proposals_quota`: daily ceilings for app tokens.

## Changing the schema

1. Add a new migration in `supabase/migrations`. Never edit one that has shipped.
2. Add or update pgTAP tests in `supabase/tests` (`pnpm test:db`). If you add a function, update the privilege audit allow-list.
3. Run `pnpm db:types` and commit the regenerated types.
4. Enable Row Level Security on every new table in the same migration.
