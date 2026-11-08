/** Safe categories only: provider messages may include recipient details. */
export type EmailFailureReason =
  "test_recipients_only" | "domain_unverified" | "invalid_address";

export function emailFailureReason(
  message?: string
): EmailFailureReason | undefined {
  if (!message) return undefined;
  if (
    /only send testing emails|only.*send.*own email|testing.*recipients/i.test(
      message
    )
  )
    return "test_recipients_only";
  if (/domain[^.\n]*not verified|domain[^.\n]*isn't verified/i.test(message))
    return "domain_unverified";
  if (
    /invalid[^.\n]*(?:email|address|["'`]to["'`]|["'`]from["'`])|(?:email|address)[^.\n]*invalid/i.test(
      message
    )
  )
    return "invalid_address";
  return undefined;
}
