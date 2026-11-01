import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createEventAction,
  updateEventAction,
} from "@/features/events/actions";
import {
  createGuestAction,
  importGuestsAction,
  updateGuestAction,
} from "@/features/guests/actions";
import type { GuestUpdate } from "@/features/guests/types";
import { updateInvitationDesignAction } from "@/features/invitations/actions";
import { requireWriteAccess, type ToolContext } from "../guard";
import { dataResult, errorResult, runTool } from "../result";
import {
  addGuestInput,
  createEventInput,
  importGuestsInput,
  updateEventInput,
  updateGuestInput,
  updateInvitationDesignInput,
} from "../schemas";

export function registerWriteTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "create_event",
    {
      title: "Create a celebration",
      description:
        "Creates a new celebration owned by the signed-in host and returns its eventId and public slug. Nothing is emailed and no invitation quota is used.",
      inputSchema: createEventInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (args) =>
      runTool(async () => {
        const result = await createEventAction({
          title: args.title,
          couple: args.couple,
          date: args.date,
          venue: args.venue,
          area: args.area,
          dressCode: args.dressCode,
          rsvpBy: args.rsvpBy,
          targetParties: 200,
          intakeMethod: "skip",
        });

        if (!result.ok) return errorResult(result.error);
        return dataResult(result.data);
      })
  );

  server.registerTool(
    "update_event",
    {
      title: "Update a celebration",
      description:
        "Changes details of an existing celebration: title, couple, date, venue, area, dress code, description, status, public visibility or RSVP deadline. Only owners and planners may do this.",
      inputSchema: updateEventInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ eventId, rsvpBy, ...changes }) =>
      runTool(async () => {
        await requireWriteAccess(ctx, eventId);

        // The event schema takes strings only; an empty deadline is how it spells "clear this".
        const input =
          rsvpBy === undefined ? changes : { ...changes, rsvpBy: rsvpBy ?? "" };

        const result = await updateEventAction(eventId, input);
        if (!result.ok) return errorResult(result.error);

        const updated =
          rsvpBy === undefined
            ? Object.keys(changes)
            : [...Object.keys(changes), "rsvpBy"];
        return dataResult({ eventId, updated });
      })
  );

  server.registerTool(
    "add_guest",
    {
      title: "Add a guest",
      description:
        "Adds one guest party to a celebration. Party size covers everyone arriving on that single invitation, up to 20. No invitation is sent.",
      inputSchema: addGuestInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (args) =>
      runTool(async () => {
        await requireWriteAccess(ctx, args.eventId);

        const result = await createGuestAction(args.eventId, guestRow(args));
        if (!result.ok) return errorResult(result.error);

        return dataResult({
          guestId: result.data?.id,
          data: { name: result.data?.name },
        });
      })
  );

  server.registerTool(
    "update_guest",
    {
      title: "Update a guest",
      description:
        "Changes one guest party. Send only the fields you want changed; everything else keeps its current value. Party size caps at 20 and nobody may be moved between celebrations.",
      inputSchema: updateGuestInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (args) =>
      runTool(async () => {
        await requireWriteAccess(ctx, args.eventId);

        const { data: existing, error } = await ctx.client
          .from("guests")
          .select(
            "id, name, phone, email, side, group_name, party_size, plus_ones_allowed, is_vip, notes"
          )
          .eq("id", args.guestId)
          .eq("event_id", args.eventId)
          .maybeSingle();

        if (error) {
          throw new Error(
            "Could not read that guest right now. Nothing was changed."
          );
        }
        if (!existing) {
          return errorResult(
            "That guest is not on this celebration, or you do not have access to it."
          );
        }

        const merged: GuestUpdate = {
          name: args.name ?? existing.name,
          phone: pick(args.phone, existing.phone),
          email: pick(args.email, existing.email),
          // The guest schema rejects null and defaults a missing side to "mutual".
          side: args.side ?? existing.side ?? undefined,
          group_name: pick(args.groupName, existing.group_name),
          party_size: args.partySize ?? existing.party_size,
          plus_ones_allowed: args.plusOnesAllowed ?? existing.plus_ones_allowed,
          is_vip: args.isVip ?? existing.is_vip,
          notes: pick(args.notes, existing.notes),
        };

        const result = await updateGuestAction(args.guestId, args.eventId, {
          ...merged,
        });
        if (!result.ok) return errorResult(result.error);

        return dataResult({
          guestId: args.guestId,
          updated: Object.keys(args).filter(
            (key) => key !== "eventId" && key !== "guestId"
          ),
        });
      })
  );

  server.registerTool(
    "import_guests",
    {
      title: "Import guests",
      description:
        "Adds many guest parties in one call, up to 200 rows. Every row needs a name; the rest is optional. Rows are validated together, so one bad row rejects the whole import and nothing is written.",
      inputSchema: importGuestsInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    (args) =>
      runTool(async () => {
        await requireWriteAccess(ctx, args.eventId);

        const rows = args.guests.map((guest) => guestRow(guest));
        const result = await importGuestsAction(args.eventId, rows);
        if (!result.ok) return errorResult(result.error);

        return dataResult({ importedCount: result.data?.count ?? 0 });
      })
  );

  server.registerTool(
    "update_invitation_design",
    {
      title: "Adjust invitation design",
      description:
        "Sets the theme, headline, subheadline, attire note and personal message shown on a celebration's invitation page. Changes the design only; no invitation is sent and no quota is used.",
      inputSchema: updateInvitationDesignInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ eventId, ...design }) =>
      runTool(async () => {
        await requireWriteAccess(ctx, eventId);

        const { data: current, error } = await ctx.client
          .from("events")
          .select("dress_code, invitation_subheadline, invitation_message")
          .eq("id", eventId)
          .maybeSingle();

        if (error) {
          throw new Error(
            "Could not read that invitation right now. Nothing was changed."
          );
        }
        if (!current) {
          return errorResult(
            "That celebration does not exist, or you do not have access to it."
          );
        }

        // The action reads every field off the form, and an absent key reads back as null, which
        // its schema rejects. Omitted fields keep whatever is already stored.
        const formData = new FormData();
        formData.set("theme", design.theme);
        formData.set("headline", design.headline);
        formData.set(
          "subheadline",
          design.subheadline ?? current.invitation_subheadline ?? ""
        );
        formData.set(
          "attireNote",
          design.attireNote ?? current.dress_code ?? ""
        );
        formData.set(
          "customMessage",
          design.customMessage ?? current.invitation_message ?? ""
        );

        const result = await updateInvitationDesignAction(eventId, formData);
        if (result.error) return errorResult(result.error);

        return dataResult({ eventId, theme: design.theme });
      })
  );
}

/** An explicit `null` clears a field; `undefined` leaves whatever is already stored. */
function pick<T>(next: T | null | undefined, current: T): T | null {
  if (next === undefined) return current;
  return next;
}

/** The tools speak camelCase; the guest schemas expect the column names. */
function guestRow(guest: {
  name: string;
  phone?: string | null;
  email?: string | null;
  side?: string;
  groupName?: string | null;
  partySize: number;
  plusOnesAllowed?: boolean;
  isVip?: boolean;
  notes?: string | null;
}) {
  return {
    name: guest.name,
    phone: guest.phone,
    email: guest.email,
    side: guest.side,
    group_name: guest.groupName,
    party_size: guest.partySize,
    plus_ones_allowed: guest.plusOnesAllowed,
    is_vip: guest.isVip,
    notes: guest.notes,
  };
}
