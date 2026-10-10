function optionalHttpsUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Public website URLs must use HTTPS without credentials.");
  }
  return url.toString();
}

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "hello@juggledude.com";
if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
  throw new Error("NEXT_PUBLIC_SUPPORT_EMAIL must be a valid email address.");
}

// The operator confirmed this mailbox on 10 October 2026. Overrides need confirmation.
const supportEmailConfirmed = process.env.NEXT_PUBLIC_SUPPORT_EMAIL_CONFIRMED?.trim()
  ? process.env.NEXT_PUBLIC_SUPPORT_EMAIL_CONFIRMED.trim() === "true"
  : supportEmail === "hello@juggledude.com";
const contactAddress = process.env.NEXT_PUBLIC_CONTACT_ADDRESS?.trim() || "Mombacher Str. 101\n55122 Mainz\nGermany";
// Checked against the production dashboards and deployed app on 10 October 2026.
const processingDetails = process.env.NEXT_PUBLIC_PROCESSING_DETAILS?.trim() || "Supabase provides account authentication, the results database, and profile-photo storage. The production project is in the West EU (Ireland) region. Vercel hosts this static website through its global delivery network. Amazon Web Services provides Amazon SES for sign-in and support email, with support-mail receiving, temporary S3 storage, and Lambda forwarding configured in Europe (Stockholm). Support messages are forwarded to a Google Gmail mailbox. These European project locations do not mean that all provider operations or support-message processing take place within the EEA.";
const retentionDetails = process.env.NEXT_PUBLIC_RETENTION_DETAILS?.trim() || null;
const deletionInstructions = process.env.NEXT_PUBLIC_DELETION_INSTRUCTIONS?.trim() || "While signed in, open Profile, choose Delete account, and confirm. An internet connection is required. If you signed in with Apple, complete the Apple authorisation prompt so we can revoke the sign-in connection. The app waits for the server to confirm deletion before clearing your account’s local history and replays and signing you out. If an error is shown, retry or contact support; signing out or uninstalling alone does not delete your cloud account.";

export const site = {
  name: "Juggle Dude",
  description: "Count your juggles. Replay your best runs. Make every kickabout a little more fun. Juggle Dude is your football companion for iPhone.",
  url: optionalHttpsUrl(process.env.NEXT_PUBLIC_SITE_URL),
  appStoreUrl: optionalHttpsUrl(process.env.NEXT_PUBLIC_APP_STORE_URL),
  supportEmail,
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || "Hewad Mubariz",
  operatorCity: "Mainz",
  operatorCountry: "Germany",
  minimumAge: 18,
  supportEmailConfirmed,
  // Operator adopted this manual support-mail routine on 10 October 2026.
  supportRetentionDays: 90,
  contactAddress,
  processingDetails,
  retentionDetails,
  deletionInstructions,
  operatorDetailsReady: supportEmailConfirmed && Boolean(contactAddress),
  privacyApproved: process.env.NEXT_PUBLIC_PRIVACY_APPROVED === "true" && supportEmailConfirmed && Boolean(contactAddress && processingDetails && retentionDetails && deletionInstructions),
  policyDate: "10 October 2026",
  appleEulaUrl: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
};
