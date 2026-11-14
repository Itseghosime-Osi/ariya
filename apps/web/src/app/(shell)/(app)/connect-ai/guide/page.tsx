import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/layout/screen-header";
import { getCurrentUser } from "@/features/auth/queries";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";

export const metadata: Metadata = {
  title: "Guide to connecting an AI • Àríyá",
  description:
    "How to connect an AI to your Àríyá desk, what it can prepare, what waits for your approval, and how to undo or disconnect.",
};

const CARD =
  "rounded-3xl border border-hairline bg-white/40 px-4 pt-5 pb-6 backdrop-blur-sm sm:px-7";
const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";
const PROMPT =
  "rounded-2xl border border-wine/10 bg-ivory px-4 py-3 text-sm leading-relaxed text-on-surface";

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <Icon name="check" size={15} className="mt-0.5 shrink-0 text-gold-ink" />
      <span>{children}</span>
    </li>
  );
}

function Never({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <Icon name="lock" size={15} className="mt-0.5 shrink-0 text-gold-ink" />
      <span>{children}</span>
    </li>
  );
}

/** Every app the Connect your AI page offers, with what it needs and how its card reads. */
const APPS: { name: string; badge: string; body: string }[] = [
  {
    name: "Claude",
    badge: "Known app",
    body: "On the web, the desktop app or the phone app. The button opens Claude with Àríyá already filled in: press Add, then Connect, then Approve. On a Team or Enterprise plan, an owner may have to allow custom connectors first.",
  },
  {
    name: "ChatGPT",
    badge: "Known app",
    body: "On the web. Open Plugins (on some accounts, Settings then Connectors), turn on Developer mode under Advanced if you see it, add a custom MCP server and paste the name, description and link. What you can add depends on your ChatGPT plan; if you do not see the option, ask your workspace admin.",
  },
  {
    name: "Gemini",
    badge: "Not verified",
    body: "On the web, with a personal Google account. Open Settings, then Connectors, choose + Custom and paste the link. Google is still rolling this out, so it may not be offered in your country yet. Gemini is not on our verified list, so its card says Not verified: check the address on the card ends in googleusercontent.com (Google's own), tick the box and approve.",
  },
  {
    name: "Claude Code and Gemini CLI",
    badge: "An app on your computer",
    body: "Run the command shown under For developers. A sign-in page opens in your browser; approve it there.",
  },
  {
    name: "Codex",
    badge: "An app on your computer",
    body: "Add the setting shown under For developers to Codex's config file, then follow Codex's prompt to sign in and approve it in your browser.",
  },
  {
    name: "Any other app",
    badge: "Depends on the app",
    body: "Any app that accepts a remote (HTTP) MCP link can use the address under Copy the MCP link. If the card says Not verified, approve only when the address shown belongs to the app you are setting up.",
  },
];

export default async function ConnectAiGuidePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fconnect-ai%2Fguide");

  return (
    <div className="sm:pb-4">
      <ScreenHeader title="The guide" backHref="/connect-ai" />
      <DeskMotion className="flex flex-col gap-6 pb-16 lg:gap-8">
        <DeskItem className="standalone:max-md:hidden">
          <Link
            href="/connect-ai"
            className="desk-chip inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-label-2 hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="chevron_left" size={15} />
            Connect your AI
          </Link>
          <p className={`${EYEBROW} mt-5`}>Guide</p>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
            Let an AI do the fiddly part
          </h1>
          <p className="mt-3 max-w-xl text-sm text-on-surface-variant">
            A connected app works inside your desk. It can read your
            celebrations and prepare work, but nothing is emailed and nothing in
            your hall or seating changes until you approve it.
          </p>
        </DeskItem>

        <DeskItem className={CARD}>
          <p className={EYEBROW}>Connect an app</p>
          <ol className="mt-4 space-y-4 text-sm text-on-surface-variant">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold-ink/25 text-[11px] font-bold text-gold-ink">
                1
              </span>
              <span>
                Open{" "}
                <Link
                  href="/connect-ai"
                  className="font-semibold text-burgundy underline decoration-gold-ink/40 underline-offset-2 hover:decoration-gold-ink"
                >
                  Connect your AI
                </Link>{" "}
                and choose your app.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold-ink/25 text-[11px] font-bold text-gold-ink">
                2
              </span>
              <span>
                Follow its steps there. Each app is a little different; the
                notes below say what each one needs.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold-ink/25 text-[11px] font-bold text-gold-ink">
                3
              </span>
              <span>
                Sign in and approve the connection on the screen Àríyá shows
                you. Until you do, the app can do nothing.
              </span>
            </li>
          </ol>
        </DeskItem>

        <DeskItem className={CARD}>
          <p className={EYEBROW}>Which apps work</p>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            Every app connects to the same Àríyá address and asks you to approve
            it. The sign-in card shows which kind of app is asking.
          </p>
          <dl className="mt-4 space-y-4 text-sm text-on-surface-variant">
            {APPS.map((app) => (
              <div key={app.name}>
                <dt className="font-semibold text-on-surface">
                  {app.name}
                  <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-ink">
                    {app.badge}
                  </span>
                </dt>
                <dd className="mt-1 leading-relaxed">{app.body}</dd>
              </div>
            ))}
          </dl>
        </DeskItem>

        <DeskItem className={CARD}>
          <p className={EYEBROW}>Ask in your own words</p>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            You do not need to know the designer. Describe the evening you have
            in mind and the app works out the rest. These are the kinds of brief
            a hall or seating proposal is built for:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className={PROMPT}>
              &ldquo;Design a hall for 180 guests with a dance floor, a stage
              and an elegant feel.&rdquo;
            </p>
            <p className={PROMPT}>
              &ldquo;Lay out a garden reception for 120, long tables, and keep
              the bar near the entrance.&rdquo;
            </p>
            <p className={PROMPT}>
              &ldquo;Seat the bride&rsquo;s side by group and keep families
              together.&rdquo;
            </p>
            <p className={PROMPT}>
              &ldquo;Build a seating plan for twelve tables of eight, keeping
              children with their parents.&rdquo;
            </p>
          </div>
          <p className="mt-4 text-sm text-on-surface-variant">
            Everyday asks work the same way: &ldquo;Who has not replied yet?
            Prepare reminders for them.&rdquo; or &ldquo;Rewrite the invitation
            message so it sounds warmer.&rdquo;
          </p>
          <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
            If a brief is thin, a careful app asks a few questions first — how
            many guests, what the room must hold, which side sits where —
            instead of guessing. You can always add detail before it proposes
            anything.
          </p>
        </DeskItem>

        <DeskItem className={CARD}>
          <p className={EYEBROW}>What waits for your approval</p>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            Everything an app prepares arrives as one card at{" "}
            <Link
              href="/approvals"
              className="font-semibold text-burgundy underline decoration-gold-ink/40 underline-offset-2 hover:decoration-gold-ink"
            >
              Approvals
            </Link>
            , in plain words, before anything happens.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-on-surface-variant">
            <Point>
              <strong className="font-semibold text-on-surface">
                Invitations and reminders
              </strong>{" "}
              list who would be emailed and how many, so you can check the guest
              list before it goes out.
            </Point>
            <Point>
              <strong className="font-semibold text-on-surface">
                A hall layout
              </strong>{" "}
              shows the proposed room beside the one you have now, with the
              zones and tables that would move.
            </Point>
            <Point>
              <strong className="font-semibold text-on-surface">
                A seating plan
              </strong>{" "}
              shows who would sit at each table. One that moves guests already
              seated says so at the top, lists every move, and asks you to
              confirm a second time.
            </Point>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">
            Approving is final and one-shot; rejecting costs nothing and changes
            nothing. A card you leave alone expires after seven days.
          </p>
        </DeskItem>

        <DeskItem className={CARD}>
          <p className={EYEBROW}>What an AI can never do</p>
          <ul className="mt-4 space-y-3 text-sm text-on-surface-variant">
            <Never>
              Send an email, or approve a proposal of its own. Only you approve,
              and only in Àríyá.
            </Never>
            <Never>
              Write your hall or seating directly. It can only propose a change;
              applying it is your decision.
            </Never>
            <Never>
              Delete anything, touch billing or payments, or change team members
              and sign-in.
            </Never>
            <Never>
              Reach a celebration you have not given that connection access to,
              or read another host&rsquo;s guests.
            </Never>
            <Never>
              Follow instructions hidden in guest data. Names, groups and RSVP
              notes are shown to it as text to report, never as commands.
            </Never>
          </ul>
        </DeskItem>

        <DeskItem className={CARD}>
          <p className={EYEBROW}>Undo a change</p>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            Before a hall or seating change is applied, Àríyá keeps a copy of
            what was there before. For seven days after you approve it, the card
            offers{" "}
            <strong className="font-semibold text-on-surface">
              Restore previous
            </strong>
            , which puts the earlier layout or seating back through the same
            checks.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
            Restoring works once. A second restore is refused, and after seven
            days the card no longer offers it, so undo is not a way to flip a
            room back and forth.
          </p>
        </DeskItem>

        <DeskItem className={CARD}>
          <p className={EYEBROW}>Disconnect an app</p>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            Every approved app is listed on{" "}
            <Link
              href="/connect-ai"
              className="font-semibold text-burgundy underline decoration-gold-ink/40 underline-offset-2 hover:decoration-gold-ink"
            >
              Connect your AI
            </Link>{" "}
            with the date it connected and what it was granted. Disconnecting
            asks you to confirm, then revokes the app&rsquo;s access; its next
            call is refused.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
            Disconnecting deletes nothing the app created. A proposal it left
            waiting stays on your approvals desk and you may still decide it —
            the card then says the app is no longer connected.
          </p>
        </DeskItem>
      </DeskMotion>
    </div>
  );
}
