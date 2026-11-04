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
  subtextStyle,
  buttonContainer,
  buttonStyle,
  footerSection,
  footerText,
  getDefaultPassUrl,
} from "./styles";

interface RsvpDeclinedEmailProps {
  guestName: string;
  couple: string;
  title: string;
  passUrl?: string;
}

export function RsvpDeclinedEmail({
  guestName = "Honoured Guest",
  couple = "Celebrants",
  title = "Wedding Celebration",
  passUrl = getDefaultPassUrl(),
}: RsvpDeclinedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>RSVP Received • {title}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={headerSection}>
            <Text style={monogramStyle}>À</Text>
            <Text style={subHeaderStyle}>RSVP ACKNOWLEDGEMENT</Text>
          </Section>

          <Section style={cardSection}>
            <Heading style={headingStyle}>You Will Be Missed</Heading>
            <Text style={coupleStyle}>{couple}</Text>

            <Text style={greetingStyle}>
              Dear {guestName}, we have received your regrets for the
              celebration of <strong>{title}</strong>. Though you cannot attend,
              your warm wishes and blessings are deeply appreciated.
            </Text>

            <Hr style={dividerStyle} />

            <Text style={subtextStyle}>
              Should your plans change, your invitation pass remains active
              until the RSVP cutoff date.
            </Text>

            <Section style={buttonContainer}>
              <Button style={buttonStyle} href={passUrl}>
                View Celebration or Revise RSVP
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

export default RsvpDeclinedEmail;
