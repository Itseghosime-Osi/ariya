import type { DocPage } from "../types";

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
        t: "h2",
        x: "For hosts and planners",
      },
      {
        t: "p",
        x: "Create a celebration, organise your guests, design invitations and follow their replies. When the day arrives, your team can use the seating plan and check-in desk.",
      },
      {
        t: "h2",
        x: "For guests",
      },
      {
        t: "p",
        x: "Open the personal invitation your host sends you. Read the details, accept or decline, and keep your entry code handy if one is shown. You do not need a host account to reply.",
      },
      {
        t: "h2",
        x: "For the welcome team",
      },
      {
        t: "p",
        x: "Ask the host to add you to the event team before the day. Use the [check-in guide](/documentation/check-in) to find a guest, verify their pass and record their arrival.",
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
      {
        t: "h2",
        x: "Your first steps",
      },
      {
        t: "ol",
        x: [
          "Open Àríyá and create an account, or sign in. Follow any email-confirmation instructions shown.",
          "From My Events, create a celebration. Complete the steps with its occasion, names, date and venue.",
          "Add a small group of guests and check their names and contact details.",
          "Open Invitations, personalise the card and save your design.",
          "Send an invitation or copy a guest’s personal link to share with them.",
          "Return to the guest list to follow replies, then seat confirmed guests.",
        ],
      },
      {
        t: "h2",
        x: "Before you send",
      },
      {
        t: "p",
        x: "Check the event date, venue and RSVP deadline. Preview the invitation as a guest would see it. See [Create an event](/documentation/events) and [Send invitations](/documentation/invitations).",
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
      {
        t: "h2",
        x: "Create the celebration",
      },
      {
        t: "ol",
        x: [
          "In My Events, choose the option to create a new celebration.",
          "Choose the occasion and enter the names requested.",
          "Complete the date, venue and remaining wizard steps, then finish creating the event.",
        ],
      },
      {
        t: "h2",
        x: "Keep details current",
      },
      {
        t: "p",
        x: "Use the event’s Settings and Page editor to update its details. Check what is shown on invitations and the public page before sharing them.",
      },
      {
        t: "h2",
        x: "Public or private",
      },
      {
        t: "p",
        x: "Only enable a public event page if you want its details to be accessible to people who have that page’s link. A personal guest invitation is different: it belongs to one guest party and should be shared only with that party.",
      },
    ],
  },
  {
    slug: "guests",
    title: "Build your guest list",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "Add guests, review imports and keep each party’s details together.",
    blocks: [
      {
        t: "h2",
        x: "Add a guest",
      },
      {
        t: "p",
        x: "Open Guests in your event. Add the guest’s name and any contact details you have. Set the party size and plus-one allowance carefully so the invitation reflects who is invited.",
      },
      {
        t: "h2",
        x: "Import a list",
      },
      {
        t: "p",
        x: "Use Import to upload a CSV spreadsheet and review the column mapping and validation before saving. Contact-picker and contacts-file options are also available; the phone contact picker depends on your browser.",
      },
      {
        t: "h2",
        x: "Review and organise",
      },
      {
        t: "ul",
        x: [
          "Search for a guest or filter the list by response and group.",
          "Open a guest to edit their details or copy their personal invitation link.",
          "Review possible duplicates before importing again.",
          "Keep dietary information and private notes limited to what you need to run the celebration.",
        ],
      },
      {
        t: "h2",
        x: "Follow replies",
      },
      {
        t: "p",
        x: "Accepted and declined replies appear in the guest list. Use the attendance figures as well as the number of guest parties when planning seats.",
      },
    ],
  },
  {
    slug: "invitations",
    title: "Send invitations",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Send by email, or share a guest’s personal link yourself.",
    blocks: [
      {
        t: "h2",
        x: "Choose who to invite",
      },
      {
        t: "ol",
        x: [
          "Open Invitations for the event and review the saved card.",
          "Select the guests you want to invite.",
          "Choose email delivery, or copy a personal link or message for manual sharing.",
          "Check the delivery result before sending again.",
        ],
      },
      {
        t: "h2",
        x: "Share through WhatsApp",
      },
      {
        t: "p",
        x: "Share copied links or messages in your own WhatsApp conversation. Copying a link does not send it automatically.",
      },
      {
        t: "h2",
        x: "Keep personal links personal",
      },
      {
        t: "p",
        x: "Each invitation belongs to a guest party. Send it directly to that party rather than posting it in a public group. Use the [public event page](/documentation/public-page) to share general celebration details.",
      },
      {
        t: "h2",
        x: "If an email is missing",
      },
      {
        t: "p",
        x: "Ask the guest to check spam or junk folders and confirm their email address. You can share the same personal link directly while you check the delivery result.",
      },
    ],
  },
  {
    slug: "designer",
    title: "Make the invitation yours",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Personalise your card and preview it before inviting guests.",
    blocks: [
      {
        t: "h2",
        x: "Open the designer",
      },
      {
        t: "p",
        x: "From Invitations, open the designer. Use Simple mode for a guided design or Pro mode for more detailed editing.",
      },
      {
        t: "h2",
        x: "Edit and preview",
      },
      {
        t: "ul",
        x: [
          "Choose the card’s colours and wording.",
          "Add the available text, shapes or pictures you need.",
          "Keep names, date and venue easy to read on a phone.",
          "Save your design and check it from Invitations before sending.",
        ],
      },
      {
        t: "h2",
        x: "Your guest’s copy",
      },
      {
        t: "p",
        x: "Guest-specific details appear on their personal invitation. An accepted guest can use the entry information shown on that page; the welcome team can also find them by name.",
      },
    ],
  },
  {
    slug: "public-page",
    title: "Share the celebration",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Choose what visitors can see on your event page.",
    blocks: [
      {
        t: "h2",
        x: "Prepare the page",
      },
      {
        t: "p",
        x: "Open the Page editor to review the celebration’s description, cover image, schedule and other details. Keep travel and venue information clear.",
      },
      {
        t: "h2",
        x: "Choose visibility",
      },
      {
        t: "p",
        x: "Review the event’s public visibility setting before sharing its page. A public page is for general event details; it does not replace a guest’s personal invitation.",
      },
      {
        t: "h2",
        x: "Images and privacy",
      },
      {
        t: "p",
        x: "Use images you have permission to share. Cover-image links can remain accessible to anyone who already has the image link, even after an event is made private.",
      },
    ],
  },
  {
    slug: "film",
    title: "Your celebration film",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Personalise the event film and check how guests will see it.",
    blocks: [
      {
        t: "h2",
        x: "Tell your story",
      },
      {
        t: "p",
        x: "Open the film studio in your event to work with the available photos, wording and music controls. Preview the film before sharing it with guests.",
      },
      {
        t: "h2",
        x: "Sound and accessibility",
      },
      {
        t: "p",
        x: "Let guests choose whether to listen with sound. Check names and text on a phone, and make sure the important event information is also available on the invitation or event page.",
      },
      {
        t: "h2",
        x: "Sharing music and pictures",
      },
      {
        t: "p",
        x: "Only upload music and pictures you own or have permission to use. A credit alone does not grant permission. Ask the rights holder if you are unsure whether your intended use is covered.",
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
      {
        t: "h2",
        x: "Open your invitation",
      },
      {
        t: "p",
        x: "Use the personal link sent by your host. Check that it shows your name and the correct celebration. You do not need to create a host account.",
      },
      {
        t: "h2",
        x: "Send your reply",
      },
      {
        t: "ol",
        x: [
          "Choose whether you are attending.",
          "If accepting, confirm how many of your invited party will attend.",
          "Add your plus-one’s name if your invitation allows one, and answer any questions shown.",
          "Submit and check the confirmation on the page.",
        ],
      },
      {
        t: "h2",
        x: "Bring your entry details",
      },
      {
        t: "p",
        x: "If an entry seal or code is shown after accepting, keep it available for arrival. The welcome team can also search for you by name.",
      },
      {
        t: "h2",
        x: "Need to change something?",
      },
      {
        t: "p",
        x: "Use the update option if it is available. If the deadline has passed, the event is closed, or the link does not work, contact the host. Do not use another guest’s link.",
      },
    ],
  },
  {
    slug: "seating",
    title: "Give everyone a place",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "Arrange tables, seat confirmed guests and prepare a plan for the day.",
    blocks: [
      {
        t: "h2",
        x: "Plan the room",
      },
      {
        t: "p",
        x: "Open Seating for your event. Add tables with the right capacity, then arrange them in the hall. Use the list view if you prefer working with rows rather than the room view.",
      },
      {
        t: "h2",
        x: "Seat confirmed guests",
      },
      {
        t: "ul",
        x: [
          "Seat guests who have accepted their invitations.",
          "Count the whole attending party when assigning a table.",
          "Use the capacity shown on each table; a full table cannot take another party.",
          "Review any auto-seating suggestions before relying on the final plan.",
        ],
      },
      {
        t: "h2",
        x: "Before the day",
      },
      {
        t: "p",
        x: "Check for confirmed guests without a seat. Review the table list and use the print option for a seating chart your team can refer to. Wait for changes to save before leaving the studio.",
      },
    ],
  },
  {
    slug: "team",
    title: "Prepare your welcome team",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Give helpers access before the celebration begins.",
    blocks: [
      {
        t: "h2",
        x: "Invite your helpers",
      },
      {
        t: "p",
        x: "Open Team in the celebration and invite the people who will help. Choose the role that matches the work each person needs to do.",
      },
      {
        t: "h2",
        x: "At the door",
      },
      {
        t: "p",
        x: "Use the staff role for helpers who need to verify passes and admit guests. Arrange a short practice before the day so everyone knows the event, the search tools and the Admit button.",
      },
      {
        t: "h2",
        x: "Keep access appropriate",
      },
      {
        t: "p",
        x: "Ask helpers to use their own accounts. Review the team after the event and remove access that is no longer needed.",
      },
    ],
  },
  {
    slug: "check-in",
    title: "Welcome guests at the door",
    group: "staff",
    audience: "Door staff",
    summary: "Find the guest, check the details, then tap Admit.",
    blocks: [
      {
        t: "h2",
        x: "Get ready",
      },
      {
        t: "p",
        x: "Sign in with the account the host added to the event team. Open the correct celebration’s Check-in desk. Allow camera access if you want to scan passes.",
      },
      {
        t: "h2",
        x: "Find and verify",
      },
      {
        t: "ol",
        x: [
          "Scan the guest’s entry seal, type their entry code, or search by name.",
          "Check the name, attending party and table shown. Read any warning before continuing.",
          "When you are ready to let the party in, tap Admit. Verifying a pass alone does not admit anyone.",
        ],
      },
      {
        t: "h2",
        x: "Already admitted or not confirmed",
      },
      {
        t: "p",
        x: "If a guest is already admitted, do not admit them again. If their invitation is not accepted or the details do not match, ask the host or lead planner to resolve it.",
      },
      {
        t: "h2",
        x: "Keep the desk connected",
      },
      {
        t: "p",
        x: "Check the connection and arrival counts during the event. If the service is unavailable, follow the host’s agreed fallback and keep a record to reconcile later; do not assume an unsent action was recorded.",
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
      {
        t: "h2",
        x: "Do guests need an account?",
      },
      {
        t: "p",
        x: "No. Guests reply using their personal invitation links. Hosts and event team members sign in to manage the celebration.",
      },
      {
        t: "h2",
        x: "Can I send invitations through WhatsApp?",
      },
      {
        t: "p",
        x: "Yes. Copy a guest’s personal link or message and share it yourself. Copying does not automatically send a message.",
      },
      {
        t: "h2",
        x: "Can someone bring a plus-one?",
      },
      {
        t: "p",
        x: "Only when their invitation allows it. Hosts set party sizes and plus-one allowances in the guest list.",
      },
      {
        t: "h2",
        x: "Why can’t I seat a guest?",
      },
      {
        t: "p",
        x: "Check that they have accepted, that the table has room for their attending party and that the event is not archived.",
      },
      {
        t: "h2",
        x: "How do I get help with an invitation?",
      },
      {
        t: "p",
        x: "Contact the host who sent it. For help with Àríyá itself, email help@ariyaday.com. Our [Privacy Policy](/privacy) explains data handling, and our [Terms](/terms) explain use of the service.",
      },
    ],
  },
];
