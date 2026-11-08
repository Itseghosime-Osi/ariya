# Send invitations

Tick guests, send by email, or copy personal links for WhatsApp and SMS.

Audience: Hosts and planners

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## The invitations page

`/events/[id]/invitations` shows the saved card, the guest tracker and the send tools. Tick guests (or select all who are not yet invited), then choose how to send.

| Channel    | Status    | How it works                                                                                                             |
| ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Email      | **Works** | Sent through Resend from `invitations@ariyaday.com`. A branded message with the guest's personal link and a reply button |
| WhatsApp   | Manual    | Copy the personal link (or a ready message) and paste it into the chat. Automatic sending is not built                   |
| Text (SMS) | Manual    | Same: copy the link or message. Automatic sending is not built                                                           |

## How bulk email behaves

- A bulk send covers **at most 10 guests per click**. Inside it, emails go out with a short pause (600 ms) between batches to stay under the provider's rate limit. For more guests, send again.
- Each send is written to `email_log`. A guest is marked **invited** only after a successful send.
- Free celebrations are limited to 20 invited guests; an owner-or-planner role is required to send.
- The free Resend plan allows roughly 100 emails a day. A larger wedding needs a paid Resend plan or several days.

## What the guest receives

A branded email with the couple's names, the date and venue, and one button to their personal link. When they open it, they see the designed card and the RSVP form (see [RSVP](rsvp.md)).

> Known limit: The email does not embed the designed card as a picture; the card is shown on the personal link page. There is also no PNG or PDF export of the card for hosts yet.

> If emails do not arrive: The Resend domain must be verified. A `validation_error` in `email_log` means the sender domain is not verified. See [Email and notifications](email.md) and [Troubleshooting](troubleshooting.md).
