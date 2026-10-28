export const mainStyle = {
  backgroundColor: "#f8f5ee",
  fontFamily: "Georgia, serif, -apple-system, BlinkMacSystemFont, sans-serif",
  padding: "40px 0",
};

export const containerStyle = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#fcfaf7",
  border: "1px solid #e8dfcf",
  borderRadius: "16px",
  overflow: "hidden" as const,
};

export const headerSection = {
  backgroundColor: "#6e1426",
  padding: "24px 20px",
  textAlign: "center" as const,
};

export const monogramStyle = {
  color: "#e9c98a",
  fontSize: "28px",
  fontWeight: "bold" as const,
  margin: "0",
  lineHeight: "1",
};

export const subHeaderStyle = {
  color: "#f4efe6",
  fontSize: "11px",
  letterSpacing: "0.15em",
  margin: "8px 0 0 0",
};

export const cardSection = {
  padding: "36px 32px",
};

export const headingStyle = {
  color: "#6e1426",
  fontSize: "24px",
  fontWeight: "normal" as const,
  textAlign: "center" as const,
  margin: "0 0 8px 0",
};

export const coupleStyle = {
  color: "#564243",
  fontSize: "16px",
  fontStyle: "italic" as const,
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

export const greetingStyle = {
  color: "#1d1c16",
  fontSize: "14px",
  lineHeight: "1.6",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

export const dividerStyle = {
  borderColor: "#e8dfcf",
  margin: "24px 0",
};

export const detailsGrid = {
  backgroundColor: "#f5ede0",
  padding: "20px",
  borderRadius: "12px",
  margin: "0 0 24px 0",
};

export const labelStyle = {
  color: "#6e1426",
  fontSize: "11px",
  fontWeight: "bold" as const,
  letterSpacing: "0.08em",
  margin: "8px 0 2px 0",
};

export const valueStyle = {
  color: "#1d1c16",
  fontSize: "14px",
  margin: "0 0 8px 0",
};

export const buttonContainer = {
  textAlign: "center" as const,
};

export const buttonStyle = {
  backgroundColor: "#6e1426",
  color: "#ffffff",
  padding: "12px 28px",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  display: "inline-block",
};

export const footerSection = {
  backgroundColor: "#f5ede0",
  padding: "16px",
  textAlign: "center" as const,
};

export const footerText = {
  color: "#564243",
  fontSize: "11px",
  margin: "0",
};

export const subtextStyle = {
  color: "#564243",
  fontSize: "13px",
  lineHeight: "1.5",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

export function getDefaultPassUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/i/sample-pass`;
}
