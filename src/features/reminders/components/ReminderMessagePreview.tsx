import React from "react";
import { Icon } from "@/components/ui/icon";

interface ReminderMessagePreviewProps {
  coupleName: string;
  venueName: string;
  subject: string;
  customMessage: string;
}

export function ReminderMessagePreview({
  coupleName,
  venueName,
  subject,
  customMessage,
}: ReminderMessagePreviewProps) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/40">
        <Icon name="visibility" className="text-wine text-lg" />
        <h4 className="font-serif text-sm font-bold text-night">
          Email Preview (Recipient Perspective)
        </h4>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-3 font-sans">
        <div className="border-b border-stone-200 pb-2 space-y-1">
          <div className="text-mist">
            <span className="font-semibold text-night">Subject:</span> {subject}
          </div>
          <div className="text-mist">
            <span className="font-semibold text-night">From:</span> Àríyá
            Celebrations &lt;concierge@ariya.app&gt;
          </div>
        </div>

        <div className="space-y-2 text-stone-800 leading-relaxed">
          <p>Hello [Guest Name],</p>
          <p>
            This is a gentle celebration reminder from{" "}
            <strong>{coupleName}</strong>. We are counting down the days and
            putting together table arrangements!
          </p>
          {customMessage && (
            <div className="border-l-2 border-wine/40 pl-3 py-1 italic bg-wine/5 rounded-r">
              {customMessage}
            </div>
          )}
          <p>
            Venue: <strong>{venueName}</strong>
          </p>
          <div className="pt-2 text-center">
            <span className="inline-block px-4 py-2 bg-wine text-ivory font-semibold rounded-lg shadow-xs">
              Confirm Your Attendance
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
