// Keep the one-use token in the fragment; never send it to this website or
// consume it during a browser/email-scanner preview.
export function appEmailLink(fragment: string): string | null {
  const raw = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!raw || raw.length > 512) return null;
  const params = new URLSearchParams(raw);
  if ([...params].length !== 2 || params.getAll("token_hash").length !== 1 || params.getAll("type").length !== 1) return null;
  const token = params.get("token_hash");
  const type = params.get("type");
  if (!token || token.match(/^pkce_[a-fA-F0-9]{40,128}$/)?.[0] !== token || !["magiclink", "signup"].includes(type ?? "")) return null;
  const safe = new URLSearchParams({ token_hash: token, type: type! });
  return `juggledude://auth/email#${safe.toString()}`;
}
