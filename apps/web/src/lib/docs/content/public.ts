import type { DocPage } from "../types";

/**
 * The public manual. Every step names the button or page as it appears in the app, so keep these
 * words in step with the screens when a label changes.
 */
export const publicPages: DocPage[] = [
  {
    slug: "overview",
    title: "A place for every guest",
    group: "start",
    audience: "Everyone",
    summary:
      "A short guide to planning, replying and welcoming guests with Àríyá.",
    blocks: [
      {
        t: "p",
        x: "Àríyá plans a celebration from the first guest to the last one through the door: weddings, traditional engagements, birthdays, naming ceremonies and every other owambe.",
      },
      { t: "h2", x: "For hosts and planners" },
      {
        t: "p",
        x: "Create a celebration, build the guest list, design the invitation and its film, and follow every reply. Seat guests in a 3D hall, keep a checklist and a run sheet for the day, track vendors, and bring in a team. Start with [Start your celebration](/documentation/quick-start).",
      },
      { t: "h2", x: "For guests" },
      {
        t: "p",
        x: "Open the personal invitation your host sends you, read the details, then accept or decline. Accepted guests see their table and their entry pass. You do not need an account or an app. See [Reply to your invitation](/documentation/rsvp).",
      },
      { t: "h2", x: "For the welcome team" },
      {
        t: "p",
        x: "Ask the host to add you to the event team before the day. On the day, the Check-in desk scans passes, finds guests by name and keeps working with no signal. See [Welcome guests at the door](/documentation/check-in).",
      },
      { t: "h2", x: "Help inside the app" },
      {
        t: "p",
        x: "New accounts get a short welcome and a tour of the celebration's Overview. The **Help** button at the top of every page shows tips for that page, and on the Overview it replays the tour. You can also replay it any time from **Show me around** in the account menu.",
      },
    ],
  },
  {
    slug: "quick-start",
    title: "Start your celebration",
    group: "start",
    audience: "Hosts and planners",
    summary:
      "From your first event to the first invitation, one step at a time.",
    blocks: [
      { t: "h2", x: "Your first steps" },
      {
        t: "ol",
        x: [
          "Create an account with your email and a passcode, or with Google. Tell us whether the celebration is your own or one you are planning for a client.",
          "From your celebrations, choose **New event**. Pick the occasion, the day, the venue and roughly how many guests are coming.",
          "Open **Guests** and add a few guests, or import a spreadsheet.",
          "Open **Invitations**, design the card and save it.",
          "Send by email, or open each guest's WhatsApp chat with their personal link ready to go.",
          "Follow the replies on the Overview and in Guests, then seat the guests who accepted.",
        ],
      },
      {
        t: "note",
        tone: "tip",
        title: "First steps",
        x: "The Overview of a new celebration shows a **First steps** list: add guests, design the invitation, send it, seat guests and invite your team. Each one ticks itself off as you go.",
      },
      { t: "h2", x: "Before you send" },
      {
        t: "p",
        x: "Check the date, venue and RSVP deadline, then preview the invitation as a guest would see it. A free celebration can send up to 20 guest invitations; the [Celebration Pass](/documentation/celebration-pass) lifts the limit. See [Create an event](/documentation/events) and [Send invitations](/documentation/invitations).",
      },
    ],
  },
  {
    slug: "events",
    title: "Create an event",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "Set the occasion, add the details and keep your celebration up to date.",
    blocks: [
      { t: "h2", x: "Create the celebration" },
      {
        t: "ol",
        x: [
          "From your celebrations, choose **New event**.",
          "**What are we celebrating?** Pick the occasion and enter the names.",
          "**Pick the day.** Choose the date and the time of day.",
          "**Where will you gather?** Enter the venue.",
          "**Who's coming?** Say roughly how many guests, and whether you will add them one by one or from a spreadsheet.",
        ],
      },
      {
        t: "p",
        x: "The new celebration opens on its **Overview**: the countdown, the replies so far, what is next and the First steps list. When you run more than one celebration, switch between them from the switcher at the top of the sidebar.",
      },
      { t: "h2", x: "Keep details current" },
      {
        t: "p",
        x: "Change the name, date, venue and dress code in **Event settings**. Every page and invitation uses these details. The celebration page itself is edited in the **Page editor**.",
      },
      { t: "h2", x: "Public or private" },
      {
        t: "p",
        x: "Turn on **Public event page** in Event settings only when you want anyone with the page's address to see the celebration's details. A guest's personal invitation is different: it belongs to one party and works whether the public page is on or off.",
      },
      { t: "h2", x: "After the day" },
      {
        t: "p",
        x: "A celebration ends with its day. From the next morning (Lagos time) it becomes a read-only record: the public page and invitation links close, and nothing can be changed. **Archive** a celebration in Event settings to file it away; find it again under Profile, where you can restore it or delete it for good. Deleting cannot be undone.",
      },
    ],
  },
  {
    slug: "guests",
    title: "Build your guest list",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "Add guests, import a list and keep each party's details together.",
    blocks: [
      { t: "h2", x: "Add a guest" },
      {
        t: "p",
        x: "Open **Guests** and choose **Add guest**. Enter the name, and a phone number or email if you have them. Set the **party size** (how many people the invitation is for) and whether a **+1 companion** is allowed. You can also give the guest a side (bride, groom, mutual), a group such as Family or Work, VIP status and notes.",
      },
      { t: "h2", x: "Import a list" },
      {
        t: "ol",
        x: [
          "Choose **Import** and pick a CSV spreadsheet. A sample file is offered if you need one.",
          "Match each column to a guest field.",
          "Review the rows, including possible duplicates and rows that will be skipped, then import.",
        ],
      },
      {
        t: "p",
        x: "You can also import a contacts file, or pick contacts straight from your phone where the browser allows it.",
      },
      { t: "h2", x: "Review and organise" },
      {
        t: "ul",
        x: [
          "Search by name, phone or email, and filter by reply, side, group or seating.",
          "Open a guest to edit their details or copy their personal invitation link.",
          "Keep dietary details and private notes to what you need for the day.",
        ],
      },
      { t: "h2", x: "Follow replies" },
      {
        t: "p",
        x: "Each guest shows as attending, declined or awaiting. Plan seats and catering from the number of people attending, not the number of invitations.",
      },
    ],
  },
  {
    slug: "invitations",
    title: "Send invitations",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Send by email, or by WhatsApp with each guest's personal link.",
    blocks: [
      { t: "h2", x: "Choose who to invite" },
      {
        t: "ol",
        x: [
          "Open **Invitations** and check the saved card.",
          "Select the guests you want to invite.",
          "Choose **Email** or **WhatsApp**.",
          "Check the result before sending again.",
        ],
      },
      { t: "h2", x: "By email" },
      {
        t: "p",
        x: "Àríyá sends the emails for you, up to ten guests at a time. Guests without an email address are skipped; reach them by WhatsApp instead.",
      },
      { t: "h2", x: "By WhatsApp" },
      {
        t: "p",
        x: "For each selected guest with a phone number, WhatsApp opens on their chat with the message and their personal link ready to go. Press Send in WhatsApp. Àríyá never sends WhatsApp messages or texts on its own.",
      },
      { t: "h2", x: "Keep personal links personal" },
      {
        t: "p",
        x: "Each link belongs to one guest party: it shows their name and lets them reply. Send it straight to that party rather than posting it in a group. To share general details, use the [public event page](/documentation/public-page).",
      },
      { t: "h2", x: "If an email is missing" },
      {
        t: "p",
        x: "Ask the guest to check their spam or junk folder and to confirm the address. You can send the same personal link by WhatsApp while you check.",
      },
    ],
  },
  {
    slug: "designer",
    title: "Make the invitation yours",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Design the card, add the entry seal and preview it.",
    blocks: [
      { t: "h2", x: "Open the designer" },
      {
        t: "p",
        x: "From **Invitations**, open the designer. **Simple** guides you through colours, wording and pictures; **Pro** gives you every layer, font and setting.",
      },
      { t: "h2", x: "Edit and preview" },
      {
        t: "ul",
        x: [
          "Choose the colours and the wording.",
          "Add text, shapes and your own pictures.",
          "Keep the names, date and venue easy to read on a phone.",
          "Save the design. Earlier versions are kept, so you can go back to one.",
        ],
      },
      { t: "h2", x: "The entry seal" },
      {
        t: "p",
        x: "Add the **entry seal** to the design and each accepted guest's invitation carries their own pass, woven into your card. The door staff scan the seal. Without it, guests are shown a plain QR card instead. Whether guests get a pass at all is set under **Give each guest an access card** in the Page editor's **RSVP & card** tab; with it off, your team checks guests in by name.",
      },
    ],
  },
  {
    slug: "public-page",
    title: "Share the celebration",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Shape the page guests open and the questions they answer.",
    blocks: [
      { t: "h2", x: "Prepare the page" },
      {
        t: "p",
        x: "Open the **Page editor**. On the **Page** tab, set the story, the cover picture, the schedule and the venue details, then preview it on a phone-sized screen. Guests can add the date to their calendar and open the venue on a map.",
      },
      { t: "h2", x: "RSVP questions and the access card" },
      {
        t: "p",
        x: "On the **RSVP & card** tab, write the questions guests answer when they reply, such as dietary needs or which events they will attend. Answers so far are shown below each question. The same tab sets whether accepted guests get an access card for the door.",
      },
      { t: "h2", x: "Choose visibility" },
      {
        t: "p",
        x: "Turn on **Public event page** in Event settings when you are ready. A public page carries the general details; it does not replace a guest's personal invitation.",
      },
      { t: "h2", x: "Pictures and privacy" },
      {
        t: "p",
        x: "Use only pictures you have permission to share. Anyone who already has the address of a picture may still open it after the page is made private.",
      },
    ],
  },
  {
    slug: "film",
    title: "Your celebration film",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Make the short film guests see before their invitation.",
    blocks: [
      { t: "h2", x: "Tell your story" },
      {
        t: "p",
        x: "Open the **Page editor** and choose the **Film** tab. Add scenes with your photos and words, make each one longer or shorter, choose the colours and add your song. Preview it, then **Save film**. Turn on **Play the film for guests** to show it before the invitation.",
      },
      { t: "h2", x: "Test mode" },
      {
        t: "p",
        x: "The same tab has the **Invitation is live** switch. Turn it off for test mode: only your team can open the invitation while you get it right. Turn it back on before you send, or guests' links will not open.",
      },
      { t: "h2", x: "Sound and accessibility" },
      {
        t: "p",
        x: "Guests choose whether to play the film with sound, and can go straight to the invitation with **Open the invitation**. A **Watch the film** button lets them see it again. Keep the important details on the invitation and the page too, not only in the film.",
      },
      { t: "h2", x: "Music and pictures" },
      {
        t: "p",
        x: "Upload only music and pictures you own or have permission to use. A credit alone does not give permission. Ask the rights holder if you are unsure.",
      },
    ],
  },
  {
    slug: "reminders",
    title: "Remind guests to reply",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Nudge the guests who have not replied, by email.",
    blocks: [
      { t: "h2", x: "Send a reminder" },
      {
        t: "ol",
        x: [
          "Open **Reminders**.",
          "Choose who to remind: everyone, or only those still awaiting a reply.",
          "Write the message and preview the email.",
          "Send.",
        ],
      },
      {
        t: "p",
        x: "Guests with no email address are listed so you can message them another way, such as WhatsApp from the guest list.",
      },
      { t: "h2", x: "Automatic reminders" },
      {
        t: "p",
        x: "In the two weeks before the celebration, Àríyá emails a reminder each morning to guests who have an email address and have not replied yet. Anyone already emailed in the last day is skipped.",
      },
    ],
  },
  {
    slug: "seating",
    title: "Give everyone a place",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Lay out the hall, seat confirmed guests and share the plan.",
    blocks: [
      { t: "h2", x: "Plan the room" },
      {
        t: "p",
        x: "Open **Seating**. Set the size of the hall, then add tables, chairs and areas such as the stage, the dance floor and the cake table. Drag them into place in the 3D hall, or let **Auto layout** offer a few arrangements to start from. On a phone, the list view seats guests table by table.",
      },
      { t: "h2", x: "Seat confirmed guests" },
      {
        t: "ul",
        x: [
          "Only guests who accepted can be seated, and their whole attending party sits together.",
          "A table shows its free seats; a full table cannot take another party.",
          "**Seat everyone** fills the tables for you. Check the result before you rely on it.",
          "**Seating rules** keep guests together, or apart, when seats are filled for you.",
          "**History** lists every change. Undo one with the button or Ctrl + Z.",
        ],
      },
      { t: "h2", x: "Share and print" },
      {
        t: "ul",
        x: [
          "**Share the floor plan** makes a view-only link for the venue or caterer. Stop sharing at any time and the old link stops working.",
          "Download the measured floor plan as a PDF.",
          "**Print cards and chart** prints place cards and a seating chart for the door.",
        ],
      },
      { t: "h2", x: "Before the day" },
      {
        t: "p",
        x: "Check that nobody who accepted is still waiting for a seat. Accepted guests see their table on their invitation. Wait for **Saved** before you close the studio.",
      },
    ],
  },
  {
    slug: "the-day",
    title: "Checklist, run sheet and vendors",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "Plan the work, set the order of the day and keep suppliers close.",
    blocks: [
      { t: "h2", x: "Checklist" },
      {
        t: "p",
        x: "Open **Checklist** and build it once: it plans the tasks from your date and your hall, each with a due date and a reason. Tick tasks off as they are done and mark the ones waiting on someone else. A weekly email lists what is due; turn it off in Settings.",
      },
      { t: "h2", x: "Run sheet" },
      {
        t: "p",
        x: "The **Run sheet** is the day from start to finish: a time, what happens and whether it is done. It fills in from the checklist, so change a time there. It still opens on a phone with no signal, once it has been opened with one.",
      },
      { t: "h2", x: "Vendors" },
      {
        t: "p",
        x: "Add each vendor in **Vendors** with their contact details, cost and deposit; the Overview adds them up into your budget. Give vendors tasks with due dates, and call or email them straight from their row.",
      },
    ],
  },
  {
    slug: "team",
    title: "Prepare your welcome team",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Bring in planners, the couple and door staff before the day.",
    blocks: [
      { t: "h2", x: "Invite your helpers" },
      {
        t: "p",
        x: "Open **Team** and choose **Invite member**. Enter their email and a role. They get a link by email that lasts seven days; if it runs out, send another. Only owners and planners can invite people or change roles.",
      },
      { t: "h2", x: "Roles" },
      {
        t: "ul",
        x: [
          "**Owner**: everything, including payment, access and every decision.",
          "**Lead Planner**: the day-to-day work: guests, seating, vendors and reminders.",
          "**Celebrant Couple**: sees the whole plan and weighs in, without changing it.",
          "**Event Staff**: the door: the check-in desk and pass scanning.",
        ],
      },
      {
        t: "p",
        x: "A celebration always keeps at least one owner.",
      },
      { t: "h2", x: "Before the day" },
      {
        t: "p",
        x: "Ask door staff to sign in and open the Check-in desk once, with a signal, before guests arrive. That saves the guest list on their phone for the moments the signal drops. A short practice helps everyone find the search and the Admit button.",
      },
      { t: "h2", x: "Keep access tidy" },
      {
        t: "p",
        x: "Ask helpers to use their own accounts, and remove access that is no longer needed after the celebration.",
      },
    ],
  },
  {
    slug: "celebration-pass",
    title: "The Celebration Pass",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Free up to 20 invitations; pay once to invite everyone.",
    blocks: [
      { t: "h2", x: "What is free" },
      {
        t: "p",
        x: "Every celebration is free up to 20 guest invitations, with the same tools as a paid one.",
      },
      { t: "h2", x: "The pass" },
      {
        t: "p",
        x: "The Celebration Pass costs ₦50,000, once for the celebration, and unlocks unlimited guest invitations. There is no subscription. Planners buy one pass per client celebration. See [pricing](/pricing).",
      },
      { t: "h2", x: "How to pay" },
      {
        t: "ol",
        x: [
          "Open **Billing** in the celebration.",
          "Choose to pay for the Celebration Pass and pay in naira through Paystack.",
          "The celebration unlocks as soon as Paystack confirms the payment.",
        ],
      },
      {
        t: "p",
        x: "Your card details go to Paystack, never to Àríyá. Every attempt and tax invoice stays on the Billing page; copy the reference beside any payment for your records. Owners and planners can pay.",
      },
    ],
  },
  {
    slug: "ai-helpers",
    title: "Plan with an AI assistant",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Connect Claude, ChatGPT or Codex, and approve what it prepares.",
    blocks: [
      { t: "h2", x: "Connect an app" },
      {
        t: "p",
        x: "Choose **Connect to an AI** at the top of the screen (on a phone, it is in the account menu) and follow the guide for your app. Once connected, ask in your own words, for example to add guests or draft a seating plan.",
      },
      { t: "h2", x: "What it can and cannot do" },
      {
        t: "ul",
        x: [
          "It can read your celebrations, guests, replies and seating.",
          "It can create and edit celebrations, add or import guests and adjust invitation wording.",
          "It can prepare an invitation send, a hall layout or a seating plan, but these wait for your approval.",
          "It can never delete anything, touch payments, change your team or change how you sign in.",
        ],
      },
      { t: "h2", x: "Approvals and undo" },
      {
        t: "p",
        x: "Requests that need your yes appear in **Approvals**, with the changes shown before you decide. A change you approved can be put back for seven days from the decided list. Disconnect an app at any time from the same page.",
      },
    ],
  },
  {
    slug: "rsvp",
    title: "Reply to your invitation",
    group: "guests",
    audience: "Guests",
    summary:
      "Accept or decline, add the details your host needs and find your pass.",
    blocks: [
      { t: "h2", x: "Open your invitation" },
      {
        t: "p",
        x: "Use the personal link your host sent you by email or WhatsApp. It shows your name and the celebration. You do not need an account or an app; it opens in any phone browser. Some hosts open with a short film, which you can play with or without sound, or skip.",
      },
      { t: "h2", x: "Send your reply" },
      {
        t: "ol",
        x: [
          "Choose **Joyfully Accept** or **Regretfully Decline**.",
          "If accepting, say how many of your invited party are coming.",
          "Add your +1's name if your invitation allows one, and answer any questions shown, such as dietary needs.",
          "Add a warm wish if you like, and submit.",
        ],
      },
      { t: "h2", x: "Your table and your pass" },
      {
        t: "p",
        x: "Once you accept, your invitation shows your table when the host has seated you, and your entry pass if the host uses one. Keep the invitation on your phone and show it at the door. The welcome team can also find you by name.",
      },
      { t: "h2", x: "Getting there" },
      {
        t: "p",
        x: "Use **Add to Calendar** to save the date, and **Get Directions** to open the venue on a map.",
      },
      { t: "h2", x: "Need to change something?" },
      {
        t: "p",
        x: "Open the same link and choose **Update RSVP or dietary preferences**. After the RSVP deadline, or once the celebration has ended, the link no longer takes changes; contact the host. Never use another guest's link.",
      },
    ],
  },
  {
    slug: "check-in",
    title: "Welcome guests at the door",
    group: "staff",
    audience: "Door staff",
    summary: "Scan or find the guest, check the details, then tap Admit.",
    blocks: [
      { t: "h2", x: "Get ready" },
      {
        t: "p",
        x: "Sign in with the account the host added to the team, and open the celebration's **Check-in** desk. Do this once with a signal before guests arrive, so the guest list is saved on your phone. Allow camera access to scan passes.",
      },
      { t: "h2", x: "Find and verify" },
      {
        t: "ol",
        x: [
          "Scan the pass on the guest's invitation, type the code printed on it, or search their name.",
          "Check the name, the party size and the table shown, and read any warning.",
          "Tap **Admit**. Use + and − to admit more or fewer of the party. Verifying a pass alone admits nobody.",
        ],
      },
      { t: "h2", x: "Already admitted or not confirmed" },
      {
        t: "p",
        x: "The desk refuses a party that is already fully in, and a guest whose reply is not accepted. Ask the host or lead planner to sort out anything that does not match.",
      },
      { t: "h2", x: "When the signal drops" },
      {
        t: "p",
        x: "The desk keeps working from the copy on your phone: scan, search and admit as usual. The status line says **No signal**, and admissions show **Waiting to send**. When the signal returns they are sent on their own. If another phone let the same guest in meanwhile, nobody is counted twice, and the desk lists them as already let in on another phone.",
      },
      {
        t: "note",
        tone: "warn",
        x: "Keep the Check-in page open, and do not sign out, while admissions are waiting to send. The copy of the guest list is wiped from the phone two days after the celebration.",
      },
    ],
  },
  {
    slug: "account",
    title: "Your account and the app",
    group: "start",
    audience: "Hosts, planners and staff",
    summary:
      "Install Àríyá on your phone, choose notifications and keep your account safe.",
    blocks: [
      { t: "h2", x: "Put Àríyá on your home screen" },
      {
        t: "p",
        x: "Àríyá installs like an app, with no app store. On iPhone, open it in Safari, tap Share, then **Add to Home Screen**. On Android, open it in Chrome and choose **Install app**. On a computer, use the install icon at the right of Chrome's or Edge's address bar.",
      },
      { t: "h2", x: "Notifications" },
      {
        t: "p",
        x: "In **Settings**, choose to hear the moment a guest replies, and whether to get the Monday checklist email. Set quiet hours so nothing arrives at night.",
      },
      { t: "h2", x: "Signing in" },
      {
        t: "p",
        x: "Sign in with your email and passcode, or with Google. Forgot your passcode? Choose to reset it on the sign-in page. **Sign out of all devices** in Settings ends every session, including the one you are using.",
      },
      { t: "h2", x: "Archived celebrations" },
      {
        t: "p",
        x: "Celebrations you file away are kept under **Profile**. Restore one to bring it back, or delete it for good.",
      },
    ],
  },
  {
    slug: "faq",
    title: "A little help",
    group: "start",
    audience: "Everyone",
    summary: "Answers to common questions before and on the day.",
    blocks: [
      { t: "h2", x: "Do guests need an account or an app?" },
      {
        t: "p",
        x: "No. Guests reply from their personal link in any phone browser. Hosts and their team sign in to manage the celebration.",
      },
      { t: "h2", x: "Does Àríyá send WhatsApp messages for me?" },
      {
        t: "p",
        x: "No. Àríyá opens each guest's WhatsApp chat with the message and link ready, and you press Send. Emails, though, are sent for you.",
      },
      { t: "h2", x: "Can someone bring a plus-one?" },
      {
        t: "p",
        x: "Only when their invitation allows it. Hosts set the party size and the +1 allowance for each guest.",
      },
      { t: "h2", x: "Why can't I seat a guest?" },
      {
        t: "p",
        x: "Check that they have accepted, that the table has room for their whole attending party, and that the celebration has not ended or been archived.",
      },
      { t: "h2", x: "Why won't a guest's link open?" },
      {
        t: "p",
        x: "The invitation may be in test mode (see [the film](/documentation/film)), or the celebration has ended. Links close the day after the celebration.",
      },
      { t: "h2", x: "Does check-in work without a signal?" },
      {
        t: "p",
        x: "Yes, if the desk was opened once with a signal on that phone. See [Welcome guests at the door](/documentation/check-in).",
      },
      { t: "h2", x: "How much does it cost?" },
      {
        t: "p",
        x: "Free up to 20 guest invitations. The [Celebration Pass](/documentation/celebration-pass) is ₦50,000, once per celebration.",
      },
      { t: "h2", x: "How do I get help?" },
      {
        t: "p",
        x: "Guests: contact the host who sent the invitation. For help with Àríyá itself, email help@ariyaday.com. Our [Privacy Policy](/privacy) explains how data is handled, and our [Terms](/terms) cover use of the service.",
      },
    ],
  },
];
