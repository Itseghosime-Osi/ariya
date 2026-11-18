import React from "react";
import { GuestMark } from "@/components/site/guest-mark";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ivory text-night font-body-md antialiased selection:bg-gold/30 selection:text-night">
      {children}
      <GuestMark />
    </div>
  );
}
