import Link from "next/link";
import type { ReactNode } from "react";

export function ContentPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <main id="main-content" className="site-container py-12 sm:py-20">
      <article className="mx-auto max-w-190">
        <Link href="/" className="mb-9 inline-block text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink">Back to Juggle Dude</Link>
        <p className="eyebrow mb-5">{eyebrow}</p>
        <h1 className="font-display text-[clamp(3.4rem,8vw,5.5rem)] leading-[0.95] font-extrabold tracking-tight uppercase">{title}</h1>
        <p className="mt-6 max-w-165 text-lg leading-relaxed text-muted">{intro}</p>
        <div className="prose-content mt-10 sm:mt-14">{children}</div>
      </article>
    </main>
  );
}
