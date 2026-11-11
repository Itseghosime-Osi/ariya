"use client";
// Local test fixture (see README.md). Copy into apps/web/src/app/(shell)/(docs)/documentation/zz-fixture/page.tsx; never commit it there.
import { InvitationDesigner } from "@/features/invitations/components/designer/InvitationDesigner";
import { designFromEvent } from "@/features/invitations/design";

const content = {
  title: "Adaeze & Tunde's Wedding",
  couple: "Adaeze & Tunde",
  date: "2027-03-20",
  venue: "The Lagos Event Centre",
  area: "Victoria Island, Lagos",
  dressCode: "Aso-ebi, gold and ivory",
  rsvpBy: "2027-03-01",
  theme: "ivory",
};
export default function Fixture() {
  return (
    <InvitationDesigner
      eventId="00000000-0000-0000-0000-000000000001"
      eventTitle={content.title}
      content={content}
      initialDesign={designFromEvent(content)}
      coupleName={content.couple}
      backHref="/documentation"
      requireAccessCard={true}
      settingsHref="/documentation"
    />
  );
}
