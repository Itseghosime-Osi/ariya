import { z } from "zod";
import { GUEST_SIDE_ENUM } from "@/features/guests/schemas";
import { invitationThemeEnum } from "@/features/invitations/schemas";
import {
  hallLayoutSchema,
  tablePositionsSchema,
} from "@/features/seating/schemas";
import { MAX_SEATING_ASSIGNMENTS } from "@/features/seating/plan-checks";

export const MAX_PAGE_SIZE = 50;
export const MAX_IMPORT_ROWS = 200;

/**
 * A send proposal is one decision by one person, and the desk shows what it would do to the whole
 * list before it is approved, so it stays small enough to read. Kept in step with
 * `MAX_APPLY_GUESTS` in `src/features/approvals/schemas.ts`.
 */
export const MAX_PROPOSAL_GUESTS = 25;

/** The kinds a proposal may carry. Only the two sending kinds are applied today. */
export const PROPOSAL_KINDS = [
  "send_invitations",
  "send_reminders",
  "apply_hall_layout",
  "apply_seating_plan",
] as const;

export const PROPOSAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "applied",
  "failed",
] as const;

const eventId = z.string().uuid("eventId must be a UUID");
const guestId = z.string().uuid("guestId must be a UUID");

const page = z.number().int().min(1).default(1);
const pageSize = z.number().int().min(1).max(MAX_PAGE_SIZE).default(25);

const dateString = z
  .string()
  .trim()
  .min(10)
  .max(40)
  .describe(
    "A calendar date, ideally YYYY-MM-DD. Anything else is parsed as a date and read in West Africa Time (UTC+1)."
  );

export const listEventsInput = z.object({
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .describe("Match on celebration title or couple names."),
  status: z.enum(["draft", "active", "archived"]).optional(),
  page,
  pageSize,
});

export const getEventOverviewInput = z.object({ eventId });

export const listGuestsInput = z.object({
  eventId,
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .describe("Match on guest name, phone or email."),
  side: z.enum(GUEST_SIDE_ENUM).optional(),
  group: z.string().trim().max(80).optional().describe("Exact group name."),
  rsvpStatus: z.enum(["accepted", "declined", "pending"]).optional(),
  seatedStatus: z.enum(["seated", "unseated"]).optional(),
  isVip: z.boolean().optional(),
  page,
  pageSize,
});

export const getRsvpSummaryInput = z.object({ eventId });

export const listTablesAndSeatingInput = z.object({ eventId });

export const getHallLayoutInput = z.object({ eventId });

/** Asks about the hall designer's rules themselves, so it takes nothing. */
export const getHallRulesInput = z.object({});

/** Asks about the connection itself, so it takes nothing. */
export const whoamiInput = z.object({});

export const createEventInput = z.object({
  title: z.string().trim().min(3).max(120),
  couple: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .describe("Both names, e.g. 'Ada & Tunde'."),
  date: dateString,
  venue: z.string().trim().min(2).max(200),
  area: z
    .string()
    .trim()
    .max(120)
    .optional()
    .describe("City or neighbourhood."),
  dressCode: z.string().trim().max(160).optional(),
  rsvpBy: dateString.optional().describe("Deadline for replies."),
});

const EVENT_STATUS = z.enum(["draft", "active", "archived"]);

export const updateEventInput = z.object({
  eventId,
  title: z.string().trim().min(3).max(120).optional(),
  couple: z.string().trim().min(3).max(120).optional(),
  date: dateString.optional(),
  venue: z.string().trim().min(2).max(200).optional(),
  area: z.string().trim().max(120).optional(),
  dressCode: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  status: EVENT_STATUS.optional(),
  isPublic: z.boolean().optional(),
  rsvpBy: dateString.nullable().optional(),
});

// Kept separate from `guestFields` so the default only applies on create: an update that omits
// partySize must leave the stored size alone rather than reset it to 1.
const partySize = z.number().int().min(1).max(20);

const guestFields = {
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(32).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  side: z.enum(GUEST_SIDE_ENUM).optional(),
  groupName: z.string().trim().max(80).nullable().optional(),
  partySize,
  plusOnesAllowed: z.boolean().optional(),
  isVip: z.boolean().optional(),
  notes: z.string().trim().max(600).nullable().optional(),
};

export const addGuestInput = z.object({
  eventId,
  ...guestFields,
  partySize: partySize.default(1),
});

export const updateGuestInput = z.object({
  eventId,
  guestId,
  name: guestFields.name.optional(),
  phone: guestFields.phone,
  email: guestFields.email,
  side: guestFields.side,
  groupName: guestFields.groupName,
  partySize: partySize.optional(),
  plusOnesAllowed: guestFields.plusOnesAllowed,
  isVip: guestFields.isVip,
  notes: guestFields.notes,
});

export const importGuestsInput = z.object({
  eventId,
  guests: z
    .array(z.object({ ...guestFields, partySize: partySize.default(1) }))
    .min(1)
    .max(
      MAX_IMPORT_ROWS,
      `A single import accepts at most ${MAX_IMPORT_ROWS} guests`
    ),
});

export const updateInvitationDesignInput = z.object({
  eventId,
  theme: invitationThemeEnum,
  headline: z.string().min(1).max(100),
  subheadline: z.string().max(200).optional(),
  attireNote: z.string().max(150).optional(),
  customMessage: z.string().max(500).optional(),
});

const proposalNote = z
  .string()
  .trim()
  .max(300)
  .optional()
  .describe(
    "A short note to the host explaining what you would send and why. Shown on the approval card."
  );

const proposedGuestIds = z
  .array(guestId)
  .min(1)
  .max(
    MAX_PROPOSAL_GUESTS,
    `A single proposal may name at most ${MAX_PROPOSAL_GUESTS} guests`
  )
  .optional()
  .describe(
    "The guests to contact. Omit to propose everyone who is eligible for this kind."
  );

/**
 * Both sending tools take the same arguments: what to send is the only difference, and it is in the
 * tool's name rather than in a field a model could mistype.
 */
const proposeSendInput = z.object({
  eventId,
  guestIds: proposedGuestIds,
  note: proposalNote,
});

export const proposeSendInvitationsInput = proposeSendInput;
export const proposeSendRemindersInput = proposeSendInput;

/**
 * A hall proposal is the whole room, not a few sliders: the same document the designer saves, plus
 * where every table stands. The app's own schemas do the first pass, so nothing reaches the host
 * that the designer itself would have refused to store.
 */
export const proposeHallLayoutInput = z.object({
  eventId,
  layout: hallLayoutSchema.describe(
    "The complete room, exactly as the hall designer stores it: dimensions, spacing, zones, decor, table styles, rotations, chairs, mood, ceiling."
  ),
  tablePositions: tablePositionsSchema
    .optional()
    .describe(
      "Where every table stands: id, x and y in centimetres from the top-left corner, measured to the table's centre."
    ),
  note: proposalNote,
});

export const proposeSeatingPlanInput = z.object({
  eventId,
  assignments: z
    .array(
      z.object({
        guestId,
        tableId: z.string().uuid("tableId must be a UUID"),
        seatNumber: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Optional seat at that table, 1 to its capacity."),
      })
    )
    .min(1)
    .max(
      MAX_SEATING_ASSIGNMENTS,
      `A single proposal may seat at most ${MAX_SEATING_ASSIGNMENTS} guests`
    ),
  mode: z
    .enum(["fill_unseated", "rearrange"])
    .default("fill_unseated")
    .describe(
      "fill_unseated seats guests who have no table yet and never moves anyone. rearrange may move guests who are already seated; use it only when the host asked for that."
    ),
  note: proposalNote,
});

export const listMyProposalsInput = z.object({
  eventId: eventId.optional().describe("Only proposals for this celebration."),
  status: z
    .enum(PROPOSAL_STATUSES)
    .optional()
    .describe("Only proposals in this state. Omit to see every state."),
  page,
  pageSize,
});

export type ListEventsArgs = z.infer<typeof listEventsInput>;
export type GetEventOverviewArgs = z.infer<typeof getEventOverviewInput>;
export type ListGuestsArgs = z.infer<typeof listGuestsInput>;
export type GetRsvpSummaryArgs = z.infer<typeof getRsvpSummaryInput>;
export type ListTablesAndSeatingArgs = z.infer<
  typeof listTablesAndSeatingInput
>;
export type GetHallLayoutArgs = z.infer<typeof getHallLayoutInput>;
export type GetHallRulesArgs = z.infer<typeof getHallRulesInput>;
export type WhoamiArgs = z.infer<typeof whoamiInput>;
export type CreateEventArgs = z.infer<typeof createEventInput>;
export type UpdateEventArgs = z.infer<typeof updateEventInput>;
export type AddGuestArgs = z.infer<typeof addGuestInput>;
export type UpdateGuestArgs = z.infer<typeof updateGuestInput>;
export type ImportGuestsArgs = z.infer<typeof importGuestsInput>;
export type UpdateInvitationDesignArgs = z.infer<
  typeof updateInvitationDesignInput
>;
export type ProposeSendInvitationsArgs = z.infer<
  typeof proposeSendInvitationsInput
>;
export type ProposeSendRemindersArgs = z.infer<
  typeof proposeSendRemindersInput
>;
export type ProposeHallLayoutArgs = z.infer<typeof proposeHallLayoutInput>;
export type ProposeSeatingPlanArgs = z.infer<typeof proposeSeatingPlanInput>;
export type ListMyProposalsArgs = z.infer<typeof listMyProposalsInput>;
