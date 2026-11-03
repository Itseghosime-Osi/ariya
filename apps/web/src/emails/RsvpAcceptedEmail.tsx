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

interface RsvpAcceptedEmailProps {
  guestName: string;
  couple: string;
  title: string;
  date: string;
  venue: string;
  attendingCount: number;
  dressCode?: string | null;
  tableName?: string | null;
  passUrl?: string;
}

export function RsvpAcceptedEmail({
  guestName = "Honoured Guest",
  couple = "Celebrants",
  title = "Wedding Celebration",
  date = "Saturday, 12 December 2026",
  venue = "Celebration Venue, Lagos",
  attendingCount = 1,
  dressCode = "Wine & Champagne Gold",
  tableName,
  passUrl = getDefaultPassUrl(),
}: RsvpAcceptedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Seat is Reserved • {title}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Monogram Seal */}
          <Section style={headerSection}>
            <Text style={monogramStyle}>À</Text>
            <Text style={subHeaderStyle}>CONFIRMATION OF ATTENDANCE</Text>
          </Section>

          {/* Hero Section */}
          <Section style={cardSection}>
            <Heading style={headingStyle}>Seat Confirmed</Heading>
            <Text style={coupleStyle}>{couple}</Text>
            <Text style={greetingStyle}>
              Dear {guestName}, we are delighted to confirm your seat for{" "}
              <strong>{title}</strong>. We look forward to celebrating together.
            </Text>

            <Hr style={dividerStyle} />

            {/* Event Details Grid */}
            <Section style={detailsGrid}>
              <Text style={labelStyle}>DATE &amp; TIME</Text>
              <Text style={valueStyle}>{date}</Text>

              <Text style={labelStyle}>VENUE</Text>
              <Text style={valueStyle}>{venue}</Text>

              <Text style={labelStyle}>PARTY SIZE</Text>
              <Text style={valueStyle}>
                {attendingCount} {attendingCount === 1 ? "seat" : "seats"}{" "}
                confirmed
              </Text>

              {dressCode && (
                <>
                  <Text style={labelStyle}>DRESS CODE</Text>
                  <Text style={valueStyle}>{dressCode}</Text>
                </>
              )}

              {tableName && (
                <>
                  <Text style={labelStyle}>TABLE ASSIGNMENT</Text>
                  <Text style={valueStyle}>{tableName}</Text>
                </>
              )}
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={buttonStyle} href={passUrl}>
                Access Your Digital Pass
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>Àríyá • Event Guest &amp; RSVP Suite</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default RsvpAcceptedEmail;
