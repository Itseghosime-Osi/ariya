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

interface RsvpDeclinedEmailProps {
  guestName: string;
  couple: string;
  title: string;
  passUrl: string;
}

export function RsvpDeclinedEmail({
  guestName = "Honoured Guest",
  couple = "Bride & Groom",
  title = "The Royal Nuptials",
  passUrl = "https://owambeplan.com",
}: RsvpDeclinedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You Will Be Deeply Missed • {title}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={headerSection}>
            <Text style={monogramStyle}>À</Text>
            <Text style={subHeaderStyle}>CEREMONIAL ACKNOWLEDGEMENT</Text>
          </Section>

          <Section style={cardSection}>
            <Heading style={headingStyle}>You Will Be Deeply Missed</Heading>
            <Text style={coupleStyle}>The Nuptials of {couple}</Text>

            <Text style={greetingStyle}>
              Dearest {guestName}, we have received your regrets for the
              celebration. Though distance or circumstance keeps us apart on
              this joyous day, your warmth and blessings will be felt in every
              moment.
            </Text>

            <Hr style={dividerStyle} />

            <Text style={subtextStyle}>
              Should your plans or calendar shift, your personal pass remains
              active until the ceremonial cutoff date.
            </Text>

            <Section style={buttonContainer}>
              <Button style={buttonStyle} href={passUrl}>
                View Celebration or Revise RSVP
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

export default RsvpDeclinedEmail;

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

const subtextStyle = {
  color: "#564243",
  fontSize: "13px",
  lineHeight: "1.5",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
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
