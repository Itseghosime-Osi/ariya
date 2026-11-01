import { test, expect } from "@playwright/test";
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

async function seedProposal(input: {
  userId: string;
  eventId: string;
  guestIds: string[];
  title: string;
  summary: string;
  note?: string;
  kind?: string;
  expiresInMs?: number;
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
      payload: {
        guestIds: input.guestIds,
        requestedCount: input.guestIds.length,
        ...(input.note ? { note: input.note } : {}),
      },
      status: "pending",
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

  test("offers only a rejection for a kind the app cannot carry out yet", async ({
    page,
    context,
  }) => {
    const user = await createAndLoginUser(
      page,
      context,
      "approvals_unapplicable"
    );
    const { eventId } = await createTestEvent(page);
    const userId = await userIdFor(user.email);
    const guestIds = await seedInvitedGuests(eventId, ["Ngozi Eze"]);

    const proposalId = await seedProposal({
      userId,
      eventId,
      guestIds,
      kind: "apply_seating_plan",
      title: "Apply a seating plan",
      summary: "Seat 1 guest across 1 table.",
    });

    await page.goto("/approvals");

    const card = page.getByTestId("approval-card");
    await expect(card).toContainText("Apply a seating plan");
    await expect(
      card.getByText(/àríyá cannot carry this out yet/i)
    ).toBeVisible();
    await expect(card.getByTestId("approve-proposal")).toHaveCount(0);

    // Only a rejection is offered here, so it is found by its name rather than its test id.
    await card.getByRole("button", { name: /^reject$/i }).click();

    await expect(page.getByText(/nothing is waiting/i)).toBeVisible();
    expect((await proposalRow(proposalId)).status).toBe("rejected");
  });
});
