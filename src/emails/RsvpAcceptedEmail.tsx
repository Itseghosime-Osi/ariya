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

interface RsvpAcceptedEmailProps {
  guestName: string;
  couple: string;
  title: string;
  date: string;
  venue: string;
  attendingCount: number;
  dressCode?: string | null;
  tableName?: string | null;
  passUrl: string;
}

export function RsvpAcceptedEmail({
  guestName = "Honoured Guest",
  couple = "Bride & Groom",
  title = "The Royal Nuptials",
  date = "Saturday, 12 December 2026",
  venue = "The Grand Ballroom, Lagos",
  attendingCount = 1,
  dressCode = "Wine Velvet & Champagne Gold",
  tableName,
  passUrl = "https://owambeplan.com",
}: RsvpAcceptedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Seat is Honoured & Reserved • {title}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Monogram Seal */}
          <Section style={headerSection}>
            <Text style={monogramStyle}>À</Text>
            <Text style={subHeaderStyle}>ROYAL NUPTIAL CONFIRMATION</Text>
          </Section>

          {/* Hero Section */}
          <Section style={cardSection}>
            <Heading style={headingStyle}>
              Your Seat is Honoured &amp; Reserved
            </Heading>
            <Text style={coupleStyle}>The Nuptials of {couple}</Text>
            <Text style={greetingStyle}>
              Dearest {guestName}, we have joyfully recorded your RSVP
              confirmation for{" "}
              <strong>
                {attendingCount} {attendingCount === 1 ? "seat" : "seats"}
              </strong>
              .
            </Text>

            <Hr style={dividerStyle} />

            {/* Event Details */}
            <Section style={detailsGrid}>
              <Text style={labelStyle}>DATE &amp; TIME</Text>
              <Text style={valueStyle}>{date}</Text>

              <Text style={labelStyle}>GRAND VENUE</Text>
              <Text style={valueStyle}>{venue}</Text>

              {dressCode && (
                <>
                  <Text style={labelStyle}>DRESS CODE &amp; TRADITIONS</Text>
                  <Text style={valueStyle}>{dressCode}</Text>
                </>
              )}

              {tableName && (
                <>
                  <Text style={labelStyle}>ASSIGNED TABLE</Text>
                  <Text style={valueStyle}>{tableName}</Text>
                </>
              )}
            </Section>

            <Section style={buttonContainer}>
              <Button style={buttonStyle} href={passUrl}>
                Access Your Digital Pass
              </Button>
            </Section>
          </Section>

          {/* Footer */}
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

export default RsvpAcceptedEmail;

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
  margin: "0 0 24px 0",
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
