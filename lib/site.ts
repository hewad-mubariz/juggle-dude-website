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

const supportEmailConfirmed = process.env.NEXT_PUBLIC_SUPPORT_EMAIL_CONFIRMED === "true";
const contactAddress = process.env.NEXT_PUBLIC_CONTACT_ADDRESS?.trim() || null;
const processingDetails = process.env.NEXT_PUBLIC_PROCESSING_DETAILS?.trim() || null;
const retentionDetails = process.env.NEXT_PUBLIC_RETENTION_DETAILS?.trim() || null;
const deletionInstructions = process.env.NEXT_PUBLIC_DELETION_INSTRUCTIONS?.trim() || null;

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
  contactAddress,
  processingDetails,
  retentionDetails,
  deletionInstructions,
  privacyApproved: process.env.NEXT_PUBLIC_PRIVACY_APPROVED === "true" && supportEmailConfirmed && Boolean(contactAddress && processingDetails && retentionDetails && deletionInstructions),
  policyDate: "10 October 2026",
  appleEulaUrl: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
};
