import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export default function EventNotFound() {
  return (
    <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-4">
        <Icon name="event_busy" className="text-2xl text-amber-700" />
      </div>
      <h2 className="font-serif text-2xl font-bold text-night mb-2">
        Celebration Event Not Found
      </h2>
      <p className="text-xs text-on-surface-variant max-w-md mb-6">
        This celebration does not exist, has been archived, or you do not have
        permission to view it.
      </p>
      <Link
        href="/events"
        className="px-5 py-2.5 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-all shadow-sm"
      >
        Return to My Celebrations
      </Link>
    </div>
  );
}
