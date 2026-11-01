import { test, expect } from "@playwright/test";
import {
  TABLES,
  hallLayout,
  payloadOf,
} from "../src/features/approvals/fixtures";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";

/*
 * Proposals are seeded straight into `ai_proposals` with the service role, because a real one can
 * only be raised by an app token and that needs a connector to complete an OAuth round trip. No
 * grant is fabricated to match: the client_id below is deliberately one no OAuth grant covers, so
 * the desk has to describe it honestly as an app that is no longer connected.
 */

const admin = () => serviceRoleClient();

async function userIdFor(email: string): Promise<string> {
  const { data, error } = await admin()
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  expect(error, JSON.stringify(error)).toBeNull();
  if (!data) throw new Error(`No profile for ${email}`);
  return data.id as string;
}

/**
 * Guests who have already been invited. The apply filters those out, so approving a seeded
 * proposal never reaches the email transport — which is what keeps this spec about the desk rather
 * than about delivery.
 */
async function seedInvitedGuests(
  eventId: string,
  names: string[]
): Promise<string[]> {
  const invitedAt = new Date().toISOString();
  const { data, error } = await admin()
    .from("guests")
    .insert(
      names.map((name, index) => ({
        event_id: eventId,
        name,
        email: `guest-${Date.now()}-${index}@example.test`,
        invited_at: invitedAt,
      }))
    )
    .select("id");

  expect(error, JSON.stringify(error)).toBeNull();
  return (data ?? []).map((row) => row.id as string);
}

/** A table on the floor, so a seating proposal has something to seat guests at. */
async function seedTable(
  eventId: string,
  name: string,
  capacity: number
): Promise<string> {
  const { data, error } = await admin()
    .from("tables")
    .insert({ event_id: eventId, name, capacity })
    .select("id")
    .single();

  expect(error, JSON.stringify(error)).toBeNull();
  if (!data) throw new Error(`The table ${name} was not written back.`);
  return data.id as string;
}

async function seedProposal(input: {
  userId: string;
  eventId: string;
  guestIds: string[];
  title: string;
  summary: string;
  note?: string;
  kind?: string;
  /** Replaces the default send-shaped payload, for the kinds that carry a room or a seating plan. */
  payload?: Record<string, unknown>;
  expiresInMs?: number;
  /** Defaults to pending. A decided row needs `decidedAt` to satisfy the table's own constraint. */
  status?: string;
  decidedAt?: string;
}): Promise<string> {
  const { data, error } = await admin()
    .from("ai_proposals")
    .insert({
      user_id: input.userId,
      event_id: input.eventId,
      client_id: "e2e-app-with-no-grant",
      kind: input.kind ?? "send_invitations",
      title: input.title,
      summary: input.summary,
      payload: input.payload ?? {
        guestIds: input.guestIds,
        requestedCount: input.guestIds.length,
        ...(input.note ? { note: input.note } : {}),
      },
      status: input.status ?? "pending",
      decided_at: input.decidedAt ?? null,
      expires_at: new Date(
        Date.now() + (input.expiresInMs ?? 7 * 24 * 60 * 60 * 1000)
      ).toISOString(),
    })
    .select("id")
    .single();

  expect(error, JSON.stringify(error)).toBeNull();
  if (!data) throw new Error("The seeded proposal was not written back.");
  return data.id as string;
}

async function proposalRow(id: string) {
  const { data, error } = await admin()
    .from("ai_proposals")
    .select("status, result, decided_at")
    .eq("id", id)
    .single();

  expect(error, JSON.stringify(error)).toBeNull();
  return data as {
    status: string;
    result: Record<string, unknown> | null;
    decided_at: string | null;
  };
}

test.describe("Approvals desk", () => {
  test("waits for the host, then records their rejection without sending", async ({
    page,
    context,
  }) => {
    const user = await createAndLoginUser(page, context, "approvals_reject");
    const { eventId } = await createTestEvent(page);
    const userId = await userIdFor(user.email);
    const guestIds = await seedInvitedGuests(eventId, ["Ada Obi", "Chidi Obi"]);

    const proposalId = await seedProposal({
      userId,
      eventId,
      guestIds,
      title: "Send invitations to Ada and Chidi",
      summary: "Send invitations by email to 2 guests.",
      note: "The list from my mother arrived late.",
    });

    await page.goto("/approvals");
    await expect(
      page.getByRole("heading", { name: /what your ai wants to send/i })
    ).toBeVisible();

    const card = page.getByTestId("approval-card");
    await expect(card).toContainText("Send invitations to Ada and Chidi");
    await expect(card).toContainText("2 guests");
    await expect(card).toContainText("The list from my mother arrived late.");
    // No grant was seeded, so the card may not claim the app is connected. Which of the two
    // honest labels it uses depends on whether the grant list itself could be read.
    await expect(card).toContainText(
      /An app (acting as you|that is no longer connected)/
    );
    await expect(page.getByTestId("approvals-link")).toHaveAttribute(
      "aria-label",
      "Approvals, 1 waiting"
    );

    // Nothing has left the desk yet.
    expect((await proposalRow(proposalId)).status).toBe("pending");

    await card.getByTestId("reject-proposal").click();

    await expect(page.getByText(/nothing is waiting/i)).toBeVisible();
    await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
    await expect(
      page.getByText("You rejected it. Nothing was sent.")
    ).toBeVisible();

    const decided = await proposalRow(proposalId);
    expect(decided.status).toBe("rejected");
    expect(decided.decided_at).not.toBeNull();
    expect(decided.result).toBeNull();
  });

  test("approves once, applies it, and says plainly that nothing was sent", async ({
    page,
    context,
  }) => {
    const user = await createAndLoginUser(page, context, "approvals_approve");
    const { eventId } = await createTestEvent(page);
    const userId = await userIdFor(user.email);
    const guestIds = await seedInvitedGuests(eventId, [
      "Funke Adeyemi",
      "Bola Adeyemi",
    ]);

    const proposalId = await seedProposal({
      userId,
      eventId,
      guestIds,
      title: "Send invitations to the Adeyemis",
      summary: "Send invitations by email to 2 guests.",
    });

    await page.goto("/approvals");

    const card = page.getByTestId("approval-card");
    await expect(card).toContainText("Send invitations to the Adeyemis");

    await card.getByTestId("approve-proposal").click();
    // The confirmation names what will happen and the count, before anything is sent.
    await expect(
      page.getByText(/approving this will send invitations to 2 guests/i)
    ).toBeVisible();

    await page.getByTestId("confirm-approve-proposal").click();

    await expect(page.getByText(/nothing is waiting/i)).toBeVisible();
    await expect(page.getByText("Nothing sent", { exact: true })).toBeVisible();
    await expect(page.getByText(/nothing was sent/i)).toBeVisible();

    const decided = await proposalRow(proposalId);
    expect(decided.status).toBe("applied");
    expect(decided.decided_at).not.toBeNull();
    expect(decided.result).toMatchObject({
      sentCount: 0,
      skippedCount: 2,
      reason:
        "Everyone had already been invited, or no longer has an email address.",
    });

    // It stays decided: a reload must not put it back in front of the host.
    await page.reload();
    await expect(page.getByTestId("approval-card")).toHaveCount(0);
    await expect(page.getByText("Nothing sent", { exact: true })).toBeVisible();
    expect((await proposalRow(proposalId)).status).toBe("applied");
  });

  test("shows an overdue request as expired, and never as something to approve", async ({
    page,
    context,
  }) => {
    const user = await createAndLoginUser(page, context, "approvals_expired");
    const { eventId } = await createTestEvent(page);
    const userId = await userIdFor(user.email);
    const guestIds = await seedInvitedGuests(eventId, ["Yemi Cole"]);

    await seedProposal({
      userId,
      eventId,
      guestIds,
      title: "Send invitations from last week",
      summary: "Send invitations by email to 1 guest.",
      expiresInMs: -60 * 1000,
    });

    await page.goto("/approvals");

    await expect(page.getByText(/nothing is waiting/i)).toBeVisible();
    await expect(page.getByText("Expired", { exact: true })).toBeVisible();
    await expect(
      page.getByText("It expired before you decided. Nothing was sent.")
    ).toBeVisible();
    await expect(page.getByTestId("approval-card")).toHaveCount(0);
    // An overdue request is not waiting on anyone, so the top bar does not count it.
    await expect(page.getByTestId("approvals-link")).toHaveAttribute(
      "aria-label",
      "Approvals"
    );
  });

  test("shows an approved request that never finished as interrupted, never as pending", async ({
    page,
    context,
  }) => {
    const user = await createAndLoginUser(
      page,
      context,
      "approvals_interrupted"
    );
    const { eventId } = await createTestEvent(page);
    const userId = await userIdFor(user.email);
    const guestIds = await seedInvitedGuests(eventId, ["Ifeoma Obi"]);

    // Approved eleven minutes ago and never applied: the send stopped partway, or never started.
    await seedProposal({
      userId,
      eventId,
      guestIds,
      title: "Send invitations that stopped partway",
      summary: "Send invitations by email to 1 guest.",
      status: "approved",
      decidedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    });

    await page.goto("/approvals");

    // It is decided, so it is never offered again.
    await expect(page.getByText(/nothing is waiting/i)).toBeVisible();
    await expect(page.getByTestId("approval-card")).toHaveCount(0);

    await expect(page.getByText("Interrupted", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        /Interrupted\. Some guests may have been contacted; check your invitations\./
      )
    ).toBeVisible();
  });

  test("shows the seating a proposal would change, then applies it from the card", async ({
    page,
    context,
  }) => {
    const user = await createAndLoginUser(page, context, "approvals_seating");
    const { eventId } = await createTestEvent(page);
    const userId = await userIdFor(user.email);
    const tableId = await seedTable(eventId, "Top table", 4);
    const [guestId] = await seedInvitedGuests(eventId, ["Ngozi Eze"]);

    const proposalId = await seedProposal({
      userId,
      eventId,
      guestIds: [guestId],
      kind: "apply_seating_plan",
      title: "Apply a seating plan",
      summary: "Seat 1 guest at 1 table.",
      payload: { assignments: [{ guestId, tableId }] },
    });

    await page.goto("/approvals");

    const card = page.getByTestId("approval-card");
    await expect(card).toContainText("Apply a seating plan");

    // The plan is read against the celebration as it stands, so the guest and the table are the
    // host's own names rather than whatever the app wrote in its summary.
    await expect(card).toContainText("Ngozi Eze");
    await expect(card).toContainText("Top table");
    await expect(card.getByTestId("approve-proposal")).toBeVisible();

    await card.getByTestId("approve-proposal").click();
    await card.getByTestId("confirm-approve-proposal").click();

    await expect(page.getByText(/nothing is waiting/i)).toBeVisible();
    await expect(page.getByText(/1 guest was seated/i)).toBeVisible();

    expect((await proposalRow(proposalId)).status).toBe("applied");

    // The host has a week to change their mind, and the offer comes from the recorded snapshot.
    await expect(page.getByTestId("restore-proposal")).toBeVisible();
  });

  test("draws the room a proposal would make, applies it, then puts it back", async ({
    page,
    context,
  }) => {
    const user = await createAndLoginUser(page, context, "approvals_hall");
    const { eventId } = await createTestEvent(page);
    const userId = await userIdFor(user.email);
    const first = await seedTable(eventId, "Table 1", 8);
    const second = await seedTable(eventId, "Table 2", 8);

    // The same room and the same two places the preview tests start from, so this test is about
    // what the host sees rather than about geometry.
    const proposalId = await seedProposal({
      userId,
      eventId,
      guestIds: [],
      kind: "apply_hall_layout",
      title: "Apply a hall layout",
      summary: "Set out a 30 m × 20 m room with two tables.",
      payload: payloadOf(hallLayout(), [
        { ...TABLES[0], id: first },
        { ...TABLES[1], id: second },
      ]),
    });

    await page.goto("/approvals");

    const card = page.getByTestId("approval-card");
    await expect(card).toContainText("Apply a hall layout");

    // A plan the host cannot touch, drawn by the studio's own renderer…
    await expect(card.getByTestId("hall-plan-shield")).toBeVisible();
    // …and, in words, what approving it would do.
    await expect(card).toContainText(
      "This celebration has no saved room yet, so this plan would create one: 30 m × 20 m."
    );

    await card.getByTestId("approve-proposal").click();
    await card.getByTestId("confirm-approve-proposal").click();

    await expect(page.getByText(/nothing is waiting/i)).toBeVisible();
    await expect(
      page.getByText(/the room was updated: 2 tables/i)
    ).toBeVisible();
    expect((await proposalRow(proposalId)).status).toBe("applied");

    await page.getByTestId("restore-proposal").click();

    await expect(
      page.getByText(
        "The previous room is back: 2 tables in the places they stood before."
      )
    ).toBeVisible();
    await expect(page.getByText("Restored", { exact: true })).toBeVisible();
    await expect(page.getByTestId("restore-proposal")).toHaveCount(0);
    expect((await proposalRow(proposalId)).result).toMatchObject({
      restoredCount: 2,
    });

    // Coming back to the desk is another chance to ask, and it still refuses: the row remembers.
    await page.reload();
    await expect(page.getByText("Restored", { exact: true })).toBeVisible();
    await expect(page.getByTestId("restore-proposal")).toHaveCount(0);
  });
});
