"use client";

import { GuestWithDetails } from "../types";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, MessageCircle, Copy, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GuestRowActionsProps {
  guest: GuestWithDetails;
  onSelect: (guest: GuestWithDetails) => void;
  onCopyLink: (guest: GuestWithDetails) => void;
  onShareWhatsApp: (guest: GuestWithDetails) => void;
}

export function GuestRowActions({
  guest,
  onSelect,
  onCopyLink,
  onShareWhatsApp,
}: GuestRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSelect(guest)}>
          View Details & Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCopyLink(guest)}>
          <Copy className="h-4 w-4 mr-2" />
          Copy RSVP Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShareWhatsApp(guest)}>
          <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" />
          Share on WhatsApp
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => onSelect(guest)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Guest
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
