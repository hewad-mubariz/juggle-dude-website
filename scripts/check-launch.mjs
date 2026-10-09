import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const required = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_OPERATOR_NAME", "NEXT_PUBLIC_SUPPORT_EMAIL", "NEXT_PUBLIC_APP_STORE_URL"];
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
const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("Support email is not valid.");
if (process.env.NEXT_PUBLIC_PRIVACY_APPROVED !== "true") problems.push("The privacy policy still needs review (NEXT_PUBLIC_PRIVACY_APPROVED).");

if (problems.length) {
  console.error("The website builds, but these details are needed for a public app launch:\n" + problems.map(problem => `- ${problem}`).join("\n"));
  process.exitCode = 1;
} else console.log("Launch settings are present. Verify the live App Store link, operator details, and final policy before publication.");
