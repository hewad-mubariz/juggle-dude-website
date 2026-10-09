import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-container">
      <div className="flex flex-col gap-5 border-t border-line py-7 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Juggle Dude</p>
        <nav className="flex flex-wrap gap-x-7 gap-y-3" aria-label="Footer navigation">
          <Link href="/privacy/" className="hover:text-ink">Privacy policy</Link>
          <Link href="/terms/" className="hover:text-ink">Terms</Link>
          <Link href="/support/" className="hover:text-ink">Support</Link>
        </nav>
      </div>
    </footer>
  );
}
