import { site } from "@/lib/site";

export function AppStoreLink() {
  const content = <>
    <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M10 5h4M11 19h2" /></svg>
    <span><span className="block text-[0.6875rem] leading-tight">Download on the</span><span className="block text-[1.375rem] leading-tight font-semibold tracking-tight">App Store</span></span>
  </>;

  return <a href={site.appStoreUrl} className="store-badge" aria-label="Download Juggle Dude on the App Store">{content}</a>;
}
