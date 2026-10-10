import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const required = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_PROCESSING_DETAILS",
  "NEXT_PUBLIC_RETENTION_DETAILS",
  "NEXT_PUBLIC_DELETION_INSTRUCTIONS",
  "NEXT_PUBLIC_APP_STORE_URL",
];
const problems = [];
for (const key of required) {
  if (!process.env[key]?.trim()) problems.push(`${key} is not set.`);
}
for (const key of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_STORE_URL"]) {
  const value = process.env[key]?.trim();
  if (!value) continue;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
  } catch { problems.push(`${key} must be an HTTPS URL without credentials.`); }
}
const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "hello@juggledude.com";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("Support email is not valid.");
if (process.env.NEXT_PUBLIC_SUPPORT_EMAIL_CONFIRMED !== "true") problems.push("The support/privacy mailbox has not been confirmed working.");
if (process.env.NEXT_PUBLIC_PRIVACY_APPROVED !== "true") problems.push("The policies still need review (NEXT_PUBLIC_PRIVACY_APPROVED).");

if (problems.length) {
  console.error("The website builds, but these details are needed for a public app launch:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exitCode = 1;
} else console.log("Website settings are present. This does not verify legal compliance or app functionality. Complete docs/apple-review.md and check the deployed pages before submission.");
