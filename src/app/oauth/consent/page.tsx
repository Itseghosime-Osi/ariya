import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/server";
import {
  CHANGED_ADDRESS,
  classifyApp,
  redirectTargetOf,
} from "@/features/mcp/app-trust";
import {
  ConsentCard,
  type ConsentRequest,
} from "@/features/mcp/components/ConsentCard";

export const metadata: Metadata = {
  title: "Connect an app • Àríyá",
  description: "Approve or deny an app connecting to your Àríyá account.",
  robots: { index: false, follow: false },
};

function consentPath(authorizationId: string): string {
  return `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).authorization_id;
  const authorizationId = typeof raw === "string" ? raw.trim() : "";

  if (!authorizationId) {
    return (
      <ConsentPage>
        <Notice
          title="This connection link is incomplete"
          body="Head back to the app you were connecting and start again."
        />
      </ConsentPage>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/sign-in?next=${encodeURIComponent(consentPath(authorizationId))}`
    );
  }

  const { data, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !data) {
    return (
      <ConsentPage>
        <Notice
          title="That request has expired"
          body="Connection requests only last a few minutes. Start the connection again from the app."
        />
      </ConsentPage>
    );
  }

  // Supabase answers with a finished redirect when this host has already granted these scopes. The
  // host is about to be handed a code at that address, so it gets classified first — with the code
  // and state stripped, since no allowlist entry carries a query.
  if (!("authorization_id" in data)) {
    const trust = classifyApp(redirectTargetOf(data.redirect_url));

    if (trust.tier === "unknown") {
      return (
        <ConsentPage>
          <Notice title="Connection stopped" body={CHANGED_ADDRESS} />
        </ConsentPage>
      );
    }

    redirect(data.redirect_url);
  }

  const request: ConsentRequest = {
    authorizationId: data.authorization_id,
    clientName: data.client.name || "This app",
    redirectHost: hostOf(data.redirect_uri),
    accountEmail: user.email ?? data.user.email,
    scopes: data.scope.split(/\s+/).filter(Boolean),
    // Decided here, from the redirect URI, and never from the client's own name or logo.
    trust: classifyApp(data.redirect_uri),
  };

  return (
    <ConsentPage>
      <ConsentCard request={request} />
    </ConsentPage>
  );
}

function ConsentPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ivory px-5 py-10">
      <div className="mb-7 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 place-items-center rounded-full border border-gold/50 bg-wine font-display text-2xl font-bold text-gold shadow-[0_8px_22px_-10px_rgba(74,17,29,0.8)]"
        >
          À
        </span>
        <span className="font-display text-2xl leading-none text-wine">
          Àríyá
        </span>
      </div>
      {children}
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="w-full max-w-md rounded-[28px] border border-wine/10 bg-surface-container-lowest p-7 text-center shadow-[0_18px_50px_-30px_rgba(28,7,13,0.4)]">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-wine/10 text-wine">
        <Icon name="error" size={20} />
      </span>
      <h1 className="mt-4 font-display text-xl text-night">{title}</h1>
      <p className="mt-2 text-sm text-on-surface-variant">{body}</p>
    </div>
  );
}
