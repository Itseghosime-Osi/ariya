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

interface RsvpRevisedEmailProps {
  guestName: string;
  couple: string;
  title: string;
  status: "accepted" | "declined";
  attendingCount: number;
  dietary?: string | null;
  passUrl: string;
}

export function RsvpRevisedEmail({
  guestName = "Honoured Guest",
  couple = "Bride & Groom",
  title = "The Royal Nuptials",
  status = "accepted",
  attendingCount = 1,
  dietary,
  passUrl = "https://owambeplan.com",
}: RsvpRevisedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reservation Revision Acknowledged • {title}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={headerSection}>
            <Text style={monogramStyle}>À</Text>
            <Text style={subHeaderStyle}>REVISED PROTOCOL CONFIRMATION</Text>
          </Section>

          <Section style={cardSection}>
            <Heading style={headingStyle}>
              Reservation Revision Acknowledged
            </Heading>
            <Text style={coupleStyle}>The Nuptials of {couple}</Text>

            <Text style={greetingStyle}>
              Dearest {guestName}, your ceremonial RSVP details have been
              successfully updated.
            </Text>

            <Hr style={dividerStyle} />

            <Section style={detailsGrid}>
              <Text style={labelStyle}>UPDATED STATUS</Text>
              <Text style={valueStyle}>
                {status === "accepted"
                  ? "Joyfully Attending"
                  : "Regretfully Declined"}
              </Text>

              {status === "accepted" && (
                <>
                  <Text style={labelStyle}>ATTENDING SEATS</Text>
                  <Text style={valueStyle}>
                    {attendingCount} {attendingCount === 1 ? "seat" : "seats"}
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
            <Text style={footerText}>
              Àríyá • Bespoke African Ceremonies &amp; Royal Stationery Suite
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default RsvpRevisedEmail;

const mainStyle = {
  backgroundColor: "#f8f5ee",
  fontFamily: "Georgia, serif, -apple-system, BlinkMacSystemFont, sans-serif",
  padding: "40px 0",
};

const containerStyle = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#fcfaf7",
  border: "1px solid #e8dfcf",
  borderRadius: "16px",
  overflow: "hidden" as const,
};

const headerSection = {
  backgroundColor: "#6e1426",
  padding: "24px 20px",
  textAlign: "center" as const,
};

const monogramStyle = {
  color: "#e9c98a",
  fontSize: "28px",
  fontWeight: "bold" as const,
  margin: "0",
  lineHeight: "1",
};

const subHeaderStyle = {
  color: "#f4efe6",
  fontSize: "11px",
  letterSpacing: "0.15em",
  margin: "8px 0 0 0",
};

const cardSection = {
  padding: "36px 32px",
};

const headingStyle = {
  color: "#6e1426",
  fontSize: "24px",
  fontWeight: "normal" as const,
  textAlign: "center" as const,
  margin: "0 0 8px 0",
};

const coupleStyle = {
  color: "#564243",
  fontSize: "16px",
  fontStyle: "italic" as const,
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

const greetingStyle = {
  color: "#1d1c16",
  fontSize: "14px",
  lineHeight: "1.6",
  textAlign: "center" as const,
  margin: "0 0 20px 0",
};

const dividerStyle = {
  borderColor: "#e8dfcf",
  margin: "24px 0",
};

const detailsGrid = {
  backgroundColor: "#f5ede0",
  padding: "20px",
  borderRadius: "12px",
  margin: "0 0 24px 0",
};

const labelStyle = {
  color: "#6e1426",
  fontSize: "11px",
  fontWeight: "bold" as const,
  letterSpacing: "0.08em",
  margin: "8px 0 2px 0",
};

const valueStyle = {
  color: "#1d1c16",
  fontSize: "14px",
  margin: "0 0 8px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
};

const buttonStyle = {
  backgroundColor: "#6e1426",
  color: "#ffffff",
  padding: "12px 28px",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  display: "inline-block",
};

const footerSection = {
  backgroundColor: "#f5ede0",
  padding: "16px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#564243",
  fontSize: "11px",
  margin: "0",
};
