import Link from "next/link";

export function Wordmark() {
  return <span className="font-display text-[2rem] leading-none font-extrabold tracking-[-0.035em] uppercase">Juggle <span className="text-pitch">Dude.</span></span>;
}

export function SiteHeader() {
  return (
    <header className="site-container">
      <nav className="flex min-h-22 items-center justify-between gap-4 border-b border-line py-5 sm:min-h-24" aria-label="Main navigation">
        <Link href="/" aria-label="Juggle Dude home" className="shrink-0"><Wordmark /></Link>
        <div className="flex items-center gap-5 sm:gap-8">
          <Link href="/#the-app" className="hidden text-sm font-medium hover:text-pitch sm:block">The app</Link>
          <Link href="/support/" className="text-sm font-medium hover:text-pitch">Support</Link>
          <Link href="/#download" className="button-lime px-4! text-sm sm:px-6!">Get the app</Link>
        </div>
      </nav>
    </header>
  );
}
