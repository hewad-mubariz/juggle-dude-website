import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="site-container py-24"><p className="eyebrow mb-5">404 / Out of play</p><h1 className="font-display text-7xl leading-none font-extrabold uppercase">Let’s get you<br />back on the pitch.</h1><p className="mt-6 mb-8 text-lg text-muted">That page couldn’t be found.</p><Link href="/" className="button-lime">Back to Juggle Dude</Link></main>;
}
