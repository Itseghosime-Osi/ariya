import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function InvalidLinkCard() {
  return (
    <article className="bg-[#fcfaf7] border border-[#e8dfcf] rounded-2xl p-8 sm:p-10 shadow-sm text-center space-y-6">
      <div className="w-14 h-14 rounded-full bg-wine/10 text-wine flex items-center justify-center mx-auto">
        <Icon name="link_off" className="text-2xl" />
      </div>

      <div className="space-y-2">
        <h1 className="font-serif text-2xl text-wine font-medium">
          Pass Token Inactive or Expired
        </h1>
        <p className="text-sm text-wine/80 max-w-md mx-auto leading-relaxed">
          The ceremonial invitation pass you followed does not correspond to an
          active guest record. Please verify your link or contact the hosts.
        </p>
      </div>

      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-colors shadow-sm"
        >
          <Icon name="arrow_back" className="text-sm" />
          <span>Return to Celebration Suite</span>
        </Link>
      </div>
    </article>
  );
}
