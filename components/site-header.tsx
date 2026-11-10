import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { site } from "@/lib/site";

export function Wordmark() {
  return <span className="inline-flex items-center gap-2.5 sm:gap-3"><AppLogo className="size-10 sm:size-12" /><span className="font-display text-2xl leading-[0.95] font-extrabold tracking-[-0.035em] uppercase sm:text-[2rem] sm:leading-none">Juggle <span className="block text-pitch sm:inline">Dude.</span></span></span>;
}

export function SiteHeader() {
  return (
    <header className="site-container">
      <nav className="flex min-h-22 items-center justify-between gap-3 border-b border-line py-5 sm:min-h-24" aria-label="Main navigation">
        <Link href="/" aria-label="Juggle Dude home" className="shrink-0"><Wordmark /></Link>
        <div className="flex items-center gap-3 sm:gap-8">
          <Link href="/#the-app" className="hidden text-sm font-medium hover:text-pitch sm:block">The app</Link>
          <Link href="/support/" className="text-xs font-medium hover:text-pitch sm:text-sm">Support</Link>
          <a href={site.appStoreUrl} className="button-lime px-3! text-xs whitespace-nowrap sm:px-6! sm:text-sm">Get the app</a>
        </div>
      </nav>
    </header>
  );
}
