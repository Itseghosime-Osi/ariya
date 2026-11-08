# Troubleshooting

Symptoms, causes and fixes.

Audience: Everyone

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

| Symptom                                     | Likely cause                                                                                                               | Fix                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Invitation emails never arrive              | Sender domain not verified in Resend (`validation_error` in `email_log`), wrong `RESEND_FROM_EMAIL`, or the daily free cap | Verify the domain, check the variables, send again tomorrow or upgrade the plan      |
| Only 10 guests were emailed                 | Bulk send is capped at 10 per click                                                                                        | Click send again for the rest                                                        |
| 'Payment required' when inviting            | Over 20 guests on a free event                                                                                             | Pay the Celebration Pass                                                             |
| No 'Continue with Google' button            | `NEXT_PUBLIC_GOOGLE_SIGN_IN` is not `true`                                                                                 | Enable the provider in Supabase, then set the variable and redeploy                  |
| Google sign-in shows a privacy warning      | App not published or no privacy/terms links on the consent screen                                                          | Publish the app and add `/privacy` and `/terms`                                      |
| Guest cannot find their code                | Card has no entry seal or the guest has not accepted                                                                       | Use the code line on the guest page, or search by name at the desk                   |
| Picture upload fails                        | Over 5 MB or unsupported format                                                                                            | Use a smaller JPEG, PNG or WebP                                                      |
| Seating studio looks plain, no engine decks | The WebAssembly engine failed to load                                                                                      | Reload; the app falls back to simple geometry                                        |
| AI app cannot connect                       | OAuth server not enabled, dynamic registration off, or Site URL mismatch                                                   | Follow the dashboard steps in [AI connections](mcp.md)                               |
| Staff cannot see invoices                   | By design                                                                                                                  | Only Owner, Planner and Couple can                                                   |
| Team invitation link expired                | Tokens last 7 days                                                                                                         | Send a new one                                                                       |
| App fails to start in production            | A required variable is missing or `EMAIL_TRANSPORT=mailpit`                                                                | Read the start-up error and fix the variable                                         |
| Payment succeeded but event still free      | Webhook not configured or not verified                                                                                     | Check the Paystack webhook URL and `charge.success`; the callback page also confirms |

Still stuck? Write to [help@ariyaday.com](mailto:help@ariyaday.com) with the page, what you did and what you saw.
