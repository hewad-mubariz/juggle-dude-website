function optionalHttpsUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Public website URLs must use HTTPS without credentials.");
  }
  return url.toString();
}

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;
if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
  throw new Error("NEXT_PUBLIC_SUPPORT_EMAIL must be a valid email address.");
}

export const site = {
  name: "Juggle Dude",
  description: "Count your juggles. Replay your best runs. Make every kickabout a little more fun. Juggle Dude is your football companion for iPhone.",
  url: optionalHttpsUrl(process.env.NEXT_PUBLIC_SITE_URL),
  appStoreUrl: optionalHttpsUrl(process.env.NEXT_PUBLIC_APP_STORE_URL),
  supportEmail,
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || null,
  privacyApproved: process.env.NEXT_PUBLIC_PRIVACY_APPROVED === "true" && Boolean(supportEmail && process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim()),
  policyDate: "9 October 2026",
  appleEulaUrl: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
};
