import React from "react";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { formatLagosDate } from "@/lib/format";
import type { PublicCelebration } from "@/features/events/queries";

async function handlePassLookup(formData: FormData) {
  "use server";
  const token = formData.get("token")?.toString().trim();
  if (token) {
    redirect(`/i/${encodeURIComponent(token)}`);
  }
}

export function PublicPassLookup({ event }: { event: PublicCelebration }) {
  const rsvpDeadline = event.rsvpBy ? formatLagosDate(event.rsvpBy) : null;

  return (
    <section className="p-8 sm:p-10 rounded-2xl bg-night text-ivory text-center space-y-5 shadow-2xl border border-outline-variant/20">
      <div className="w-12 h-12 rounded-2xl bg-wine/40 text-gold flex items-center justify-center mx-auto border border-gold/30 shadow-inner">
        <Icon name="mark_email_read" className="text-2xl" />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="font-serif text-2xl text-gold font-medium">
          Confirm Your Attendance
        </h3>
        <p className="text-xs sm:text-sm text-mist leading-relaxed">
          {rsvpDeadline
            ? `Please respond by ${rsvpDeadline} to ensure personalized banquet seating.`
            : "Enter your private invitation passcode sent via WhatsApp or email to access your pass and RSVP."}
        </p>
      </div>

      <form
        action={handlePassLookup}
        className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 pt-2"
      >
        <input
          type="text"
          name="token"
          required
          maxLength={40}
          placeholder="Enter invitation code..."
          className="flex-1 px-4 py-3 rounded-xl bg-surface-container-lowest text-paper-ink text-sm font-mono placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-gold border border-outline-variant/40"
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-gold hover:bg-gold/90 text-night font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2"
        >
          <span>Access Pass</span>
          <Icon name="arrow_forward" className="text-base" />
        </button>
      </form>

      <p className="text-[11px] uppercase tracking-widest text-mist/80 pt-1">
        Personalized Pass Required for Entry
      </p>
    </section>
  );
}
