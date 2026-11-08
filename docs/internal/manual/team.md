# Roles and team

Who can do what, how to invite people, and the rules the database enforces.

Audience: Owners and planners

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## The four roles

| Role    | Who                     | Manage roles          | Guests and seating | Check-in       | Billing |
| ------- | ----------------------- | --------------------- | ------------------ | -------------- | ------- |
| Owner   | The host who created it | All roles             | Yes                | Yes            | Yes     |
| Planner | A hired coordinator     | Couple and Staff only | Yes                | Yes            | Yes     |
| Couple  | The celebrants          | Read-only             | View and overview  | View           | Yes     |
| Staff   | Reception on the day    | None                  | Read-only registry | Scan and admit | Blocked |

## Inviting a team member

1. Open `/events/[id]/team` and choose a role.
2. Send the invitation link. It is a random Base62 token (22+ characters) valid for **7 days**.
3. The person signs in (or signs up) and opens `/invite/<token>` to accept.

## Guarantees the database enforces

- Nobody can change their own role.
- The last owner of a celebration cannot be removed or demoted.
- Staff cannot read invoices or payment records (Row Level Security, not just the UI).
- Sensitive side effects such as sending email check the caller's role immediately before acting. Being able to read guests is not enough.

> Note: Roles control what people can do inside a celebration. Guests are never team members.
