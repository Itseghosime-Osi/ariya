import { DOC_PAGES } from "@/lib/docs";
import { LEGAL } from "@/lib/legal/site";
import { FREE_PLAN_LIMIT } from "@/lib/plan";
import { siteUrl } from "@/lib/site-url";

/** /llms.txt: a plain summary of Àríyá and links to its manual, for AI assistants and agents (llmstxt.org). */
export function buildLlmsTxt() {
  const docs = DOC_PAGES.map(
    (p) =>
      `- [${p.title}](${siteUrl(`/documentation/${p.slug}`)}): ${p.summary}`
  ).join("\n");
  return `# Àríyá

> Àríyá (ah-ree-YAH, Yoruba for merriment) is a celebration-planning platform for Nigerian weddings and events: personal invitations, RSVP tracking, guest lists, seating plans, vendors and QR check-in at the door.

Hosts plan for free up to ${FREE_PLAN_LIMIT} guest invitations, then pay once per celebration. Guests never need an account: they open their invitation link, reply and get a pass. Hosts can also connect an AI assistant to manage their celebration.

## Pages

- [Home](${siteUrl("/")}): the film that shows what Àríyá does
- [What we do](${siteUrl("/product")}): every feature, step by step
- [Pricing](${siteUrl("/pricing")}): the free plan and the paid pass
- [About](${siteUrl("/about")}): who it is for and why
- [Privacy](${siteUrl("/privacy")}) and [Terms](${siteUrl("/terms")})

## Manual

${docs}

## Contact

- ${LEGAL.contactEmail}
`;
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
