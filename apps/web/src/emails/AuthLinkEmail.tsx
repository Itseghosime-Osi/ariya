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
} from "@react-email/components";
import {
  mainStyle,
  containerStyle,
  headerSection,
  monogramStyle,
  subHeaderStyle,
  cardSection,
  headingStyle,
  greetingStyle,
  buttonContainer,
  buttonStyle,
  footerSection,
  footerText,
  subtextStyle,
} from "./styles";

interface AuthLinkEmailProps {
  kind: "confirm" | "reset";
  name?: string | null;
  url: string;
}

const COPY = {
  confirm: {
    preview: "Confirm your email to open your Àríyá account",
    kicker: "WELCOME TO ÀRÍYÁ",
    heading: "Confirm your email",
    body: "Thank you for joining Àríyá. Confirm your email address and you are in: your celebrations, guest lists and seating plans will be waiting.",
    button: "Confirm my email",
    note: "If you did not create an Àríyá account, you can ignore this email.",
  },
  reset: {
    preview: "Reset your Àríyá passcode",
    kicker: "PASSCODE SECURITY",
    heading: "Reset your passcode",
    body: "We received a request to reset the passcode on your Àríyá account. Choose a new one with the button below.",
    button: "Choose a new passcode",
    note: "If you did not ask for this, you can ignore this email and your passcode stays the same.",
  },
};

/** The email sent to confirm a new account or to reset a passcode. */
export function AuthLinkEmail({ kind, name, url }: AuthLinkEmailProps) {
  const copy = COPY[kind];
  return (
    <Html>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={headerSection}>
            <Text style={monogramStyle}>À</Text>
            <Text style={subHeaderStyle}>{copy.kicker}</Text>
          </Section>

          <Section style={cardSection}>
            <Heading style={headingStyle}>{copy.heading}</Heading>
            {name && <Text style={greetingStyle}>Dear {name},</Text>}
            <Text style={greetingStyle}>{copy.body}</Text>
            <Section style={buttonContainer}>
              <Button style={buttonStyle} href={url}>
                {copy.button}
              </Button>
            </Section>
            <Text style={subtextStyle}>
              This link works once and expires in 24 hours. {copy.note}
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>Àríyá • Event Guest &amp; RSVP Suite</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default AuthLinkEmail;
