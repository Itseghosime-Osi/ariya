import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
} from "@react-email/components";
import {
  mainStyle,
  containerStyle,
  headerSection,
  monogramStyle,
  subHeaderStyle,
  cardSection,
  headingStyle,
  coupleStyle,
  greetingStyle,
  dividerStyle,
  detailsGrid,
  labelStyle,
  valueStyle,
  buttonContainer,
  buttonStyle,
  footerSection,
  footerText,
  getDefaultPassUrl,
} from "./styles";

interface RsvpRevisedEmailProps {
  guestName: string;
  couple: string;
  title: string;
  status: "accepted" | "declined";
  attendingCount: number;
  dietary?: string | null;
  passUrl?: string;
}

export function RsvpRevisedEmail({
  guestName = "Honoured Guest",
  couple = "Celebrants",
  title = "Wedding Celebration",
  status = "accepted",
  attendingCount = 1,
  dietary,
  passUrl = getDefaultPassUrl(),
}: RsvpRevisedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>RSVP Updated • {title}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={headerSection}>
            <Text style={monogramStyle}>À</Text>
            <Text style={subHeaderStyle}>RSVP UPDATE ACKNOWLEDGEMENT</Text>
          </Section>

          <Section style={cardSection}>
            <Heading style={headingStyle}>RSVP Updated</Heading>
            <Text style={coupleStyle}>{couple}</Text>

            <Text style={greetingStyle}>
              Dear {guestName}, your RSVP for <strong>{title}</strong> has been
              successfully updated.
            </Text>

            <Hr style={dividerStyle} />

            <Section style={detailsGrid}>
              <Text style={labelStyle}>UPDATED STATUS</Text>
              <Text style={valueStyle}>
                {status === "accepted" ? "Attending" : "Declined"}
              </Text>

              {status === "accepted" && (
                <>
                  <Text style={labelStyle}>ATTENDING COUNT</Text>
                  <Text style={valueStyle}>
                    {attendingCount} {attendingCount === 1 ? "guest" : "guests"}
                  </Text>
                </>
              )}

              {dietary && (
                <>
                  <Text style={labelStyle}>DIETARY REQUIREMENTS</Text>
                  <Text style={valueStyle}>{dietary}</Text>
                </>
              )}
            </Section>

            <Section style={buttonContainer}>
              <Button style={buttonStyle} href={passUrl}>
                View Your Digital Pass
              </Button>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>Àríyá • Event Guest &amp; RSVP Suite</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default RsvpRevisedEmail;
