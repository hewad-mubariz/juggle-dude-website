import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appEmailLink } from "../lib/email-link.ts";

const token = `pkce_${"a".repeat(56)}`;
for (const type of ["magiclink", "signup"]) {
  const link = appEmailLink(`#token_hash=${token}&type=${type}`);
  assert.equal(link, `juggledude://auth/email#token_hash=${token}&type=${type}`);
  assert.equal(new URL(link).search, "");
}
for (const fragment of ["", "#", `#token_hash=${token}&type=recovery`, `#token_hash=${token}&type=magiclink&type=signup`,
  `#token_hash=${token}&token_hash=${token}`, `#token_hash=${token}&type=magiclink&next=https://evil.example`,
  "#token_hash=javascript:alert(1)&type=magiclink", `#token_hash=${token}%0A&type=magiclink`, `#token_hash=${"a".repeat(600)}&type=magiclink`]) {
  assert.equal(appEmailLink(fragment), null, fragment);
}
const association = JSON.parse(readFileSync("public/.well-known/apple-app-site-association", "utf8"));
assert.deepEqual(association.applinks.details[0].appIDs, ["G276PSQ2LH.com.juggledude"]);
assert.deepEqual(association.applinks.details[0].components.map((item) => item["/"]), ["/auth/email/", "/auth/email"]);
console.log("Email fallback and app-domain association checks passed.");
