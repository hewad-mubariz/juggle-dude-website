"use client";

import { useEffect, useState } from "react";
import { appEmailLink } from "@/lib/email-link";

export function OpenApp() {
  const [link, setLink] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const receiveLink = () => {
      if (window.location.hash) setLink(appEmailLink(window.location.hash));
      setReady(true);
      // Remove the token from browser history once captured. No network request,
      // analytics event, cookie, or local storage receives the sign-in token.
      if (window.location.hash || window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    receiveLink();
    window.addEventListener("hashchange", receiveLink);
    return () => window.removeEventListener("hashchange", receiveLink);
  }, []);

  return (
    <div className="mt-8">
      {link ? <a className="button-lime" href={link} rel="noreferrer">Open Juggle Dude</a> :
        <p className="rounded-xl border border-line bg-soft p-5 text-muted" role="status">
          {ready ? "This release offers Sign in with Apple and guest practice. Open Juggle Dude to get started." : "Preparing your link…"}
        </p>}
      <p className="mt-5 text-sm leading-relaxed text-muted">Use the same iPhone where you requested the email. Make sure the latest Juggle Dude app is installed.</p>
    </div>
  );
}
