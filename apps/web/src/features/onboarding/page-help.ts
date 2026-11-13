/**
 * Three short things to know about each celebration page, in the host's words. The overview has
 * its tour instead, the seating studio and the invitation designer have their own guides, and a
 * page left out here simply shows no card and no Help button.
 */
export const PAGE_TIPS: Record<string, string[]> = {
  guests: [
    "Add guests one at a time, or bring in a whole spreadsheet with Import.",
    "Each guest gets their own RSVP link. Copy it from the menu on their row.",
    "Give guests a side and a group (Bride's family, Church, Work) so seating and reminders can use them.",
  ],
  reminders: [
    "Choose who to remind: everyone, or only the guests still awaiting a reply.",
    "Write the message, then preview the email before anything is sent.",
    "Guests with no email are listed, so you can reach them another way.",
  ],
  checklist: [
    "Build the checklist once: it plans the tasks from your date and your hall.",
    "Tick tasks as they are done, and mark the ones waiting on someone else.",
    "The Run sheet for the day itself fills in from this list.",
  ],
  "day-of": [
    "This is the day from start to finish: a time, what happens, and whether it is done.",
    "It fills in from your checklist. To change a time, change it there.",
    "Call or email a vendor straight from their row. It still opens without signal.",
  ],
  "check-in": [
    "Scan the QR code on a guest's invitation with your phone's camera to let them in.",
    "No phone with them? Search their name, or type the code printed on the card.",
    "Bringing extra people? Use + and − to admit one more or one fewer.",
  ],
  vendors: [
    "Add each vendor with their cost and deposit. Your budget on the desk adds them up.",
    "Give vendors tasks with due dates, and they show in your planning timeline.",
    "Keep their phone and email here, so the run sheet can reach them on the day.",
  ],
  team: [
    "Invite people by email: co-planners, the couple, and the door staff.",
    "Each role sees only what it needs. Staff, for example, get the check-in desk.",
    "An invite lasts seven days. If it runs out, simply send another.",
  ],
  "page-editor": [
    "This is the celebration page guests open: your story, the schedule and the details.",
    "Check how it looks on a phone in the preview before you share it.",
    "Switch on Public event page when you are ready for guests to see it.",
  ],
  billing: [
    "One Celebration Pass unlocks this celebration. You pay once.",
    "Every checkout attempt and tax invoice is kept here, together.",
    "Need it for your records? Copy the reference beside any payment.",
  ],
  settings: [
    "Change the name, date, venue and dress code here. Every page uses these details.",
    "Archive the celebration when it is over, to keep your list tidy.",
    "Deleting is at the very bottom, and it cannot be undone.",
  ],
};

/** The tips for a path such as /events/abc/guests, and the key they are remembered by. */
export function tipsForPath(
  pathname: string
): { key: string; items: string[] } | null {
  const m = /^\/events\/[^/]+\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  const items = PAGE_TIPS[m[1]];
  return items ? { key: m[1], items } : null;
}

/** True on a celebration's overview, where Help means the tour. */
export function isOverviewPath(pathname: string): boolean {
  return (
    /^\/events\/[^/]+\/?$/.test(pathname) &&
    !/^\/events\/new\/?$/.test(pathname)
  );
}
