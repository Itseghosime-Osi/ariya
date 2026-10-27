"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageCircle, RefreshCw } from "lucide-react";
import { regenerateTokenAction } from "../actions";

interface GuestDetailTokenCardProps {
  eventId: string;
  eventName: string;
  guestId: string;
  guestName: string;
  guestPhone: string | null;
  rsvpToken: string;
  onTokenUpdated: (newToken: string) => void;
}

export function GuestDetailTokenCard({
  eventId,
  eventName,
  guestId,
  guestName,
  guestPhone,
  rsvpToken,
  onTokenUpdated,
}: GuestDetailTokenCardProps) {
  const [copied, setCopied] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [regenError, setRegenError] = React.useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = `${origin}/rsvp/${rsvpToken}`;
  const whatsappText = encodeURIComponent(
    `Hello ${guestName}! You are cordially invited to celebrate with us at ${eventName}. Please RSVP here: ${inviteUrl}`
  );
  const whatsappUrl = guestPhone
    ? `https://wa.me/${guestPhone.replace(/[^0-9]/g, "")}?text=${whatsappText}`
    : `https://wa.me/?text=${whatsappText}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateToken = async () => {
    if (
      !confirm(
        "Regenerate invitation link? Any previous link will stop working immediately."
      )
    )
      return;

    setIsRegenerating(true);
    setRegenError(null);
    try {
      const res = await regenerateTokenAction(guestId, eventId);
      if (res.ok && res.data?.newToken) {
        onTokenUpdated(res.data.newToken);
      } else {
        setRegenError(res.ok ? null : res.error);
      }
    } catch {
      setRegenError("An unexpected error occurred");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-wine/20 bg-wine/5 p-4">
      <span className="text-xs font-semibold text-wine uppercase tracking-wider">
        RSVP Invitation Link
      </span>
      <p className="text-xs text-mist break-all font-mono select-all bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/40">
        {inviteUrl}
      </p>
      {regenError && <p className="text-xs text-red-600">{regenError}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="h-8 text-xs"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5 mr-1" />
          )}
          {copied ? "Copied Link" : "Copy Link"}
        </Button>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-emerald-700 hover:text-emerald-800"
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" />{" "}
            WhatsApp
          </Button>
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerateToken}
          disabled={isRegenerating}
          className="h-8 text-xs text-mist hover:text-wine"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1 ${isRegenerating ? "animate-spin" : ""}`}
          />
          Regenerate
        </Button>
      </div>
    </div>
  );
}
