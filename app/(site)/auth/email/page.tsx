import type { Metadata } from "next";
import { OpenApp } from "./open-app";

export const metadata: Metadata = {
  title: "Open Juggle Dude",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function EmailSignInPage() {
  return (
    <main id="main-content" className="site-container py-16 sm:py-24">
      <section className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-7 sm:p-10">
        <p className="eyebrow text-pitch">BACK TO THE BALL</p>
        <h1 className="mt-5 font-display text-5xl font-extrabold leading-none uppercase">Your sign-in belongs in the app.</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">Continue in Juggle Dude to finish signing in securely.</p>
        <OpenApp />
      </section>
    </main>
  );
}
