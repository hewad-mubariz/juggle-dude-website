import Image from "next/image";
import Link from "next/link";
import { AppStoreLink } from "@/components/app-store-link";
import { site } from "@/lib/site";

const features = [
  { label: "01 / JUGGLE", title: "You play. It counts.", description: "Prop up your phone and start juggling. Your camera follows the ball and counts your touches." },
  { label: "02 / REPLAY", title: "Keep the good ones.", description: "Watch your session back, see your touches, and export a video to share with your mates." },
  { label: "03 / STYLE", title: "Your ball, with a twist.", description: "Try a different ball style and add effects to give your clips a little personality." },
];

export default function Home() {
  return (
    <main id="main-content">
      <section className="site-container grid items-center gap-9 py-10 sm:py-13 md:grid-cols-2 md:gap-16 lg:gap-22" aria-labelledby="hero-title">
        <div className="py-2 md:py-8">
          <p className="eyebrow mb-6">Your ball. Your phone. Your game.</p>
          <h1 id="hero-title" className="font-display text-[clamp(5rem,10.2vw,8.25rem)] leading-[0.88] font-extrabold tracking-[-0.025em] uppercase">Keep it<br />up, <span className="text-pitch">dude.</span></h1>
          <p className="mt-7 mb-7 max-w-93 text-base leading-[1.7] text-muted sm:text-lg">Count your juggles. Replay your best runs. Make every kickabout a little more fun.</p>
          <AppStoreLink />
          <p className="mt-3 text-sm text-muted">Made for iPhone. Just bring a football.</p>
        </div>
        <div className="relative h-106 overflow-hidden rounded-2xl sm:h-130 lg:h-150">
          <Image src="/images/juggling-hero.jpg" alt="A football player juggling on a sunny neighborhood court" fill preload sizes="(max-width: 767px) 89vw, (max-width: 1350px) 42vw, 560px" className="object-cover object-[center_58%]" />
          <p className="absolute bottom-5 left-5 max-w-[calc(100%-2.5rem)] rounded-lg bg-ink px-4 py-3 text-sm text-paper">One more touch. Then one more.</p>
        </div>
      </section>

      <div className="bg-lime text-ink">
        <div className="site-container flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5 text-xs leading-relaxed font-bold tracking-[0.08em] uppercase sm:justify-around sm:text-sm">
          <span>Count your touches</span><span>Watch it back</span><span>Make it yours</span>
        </div>
      </div>

      <section id="the-app" className="site-container py-13 sm:py-17" aria-labelledby="features-title">
        <h2 id="features-title" className="mb-9 max-w-220 font-display text-[clamp(2.6rem,4.5vw,3.75rem)] leading-[1] font-bold tracking-tight uppercase">A little practice.<br className="sm:hidden" /> A better personal best.</h2>
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-9 lg:gap-14">
          {features.map(feature => <article key={feature.label} className="border-t border-line pt-5"><p className="text-xs font-medium tracking-wider text-pitch">{feature.label}</p><h3 className="mt-3 mb-3 text-xl leading-snug font-bold">{feature.title}</h3><p className="max-w-90 text-base leading-[1.7] text-muted">{feature.description}</p></article>)}
        </div>
      </section>

      <section id="download" className="site-container mb-13" aria-labelledby="download-title">
        <div className="flex flex-col items-start justify-between gap-7 rounded-2xl bg-soft p-7 sm:flex-row sm:items-center sm:p-9 lg:p-11">
          <div><h2 id="download-title" className="max-w-175 font-display text-[clamp(2rem,3.8vw,3rem)] leading-[1.05] font-bold tracking-tight uppercase">See how long you can keep it up.</h2><p className="mt-2 text-base leading-relaxed text-muted">{site.appStoreUrl ? "A football and an iPhone. That’s your setup." : "Coming soon to iPhone. A football and a phone—that’s your setup."}</p></div>
          {site.appStoreUrl ? <a href={site.appStoreUrl} className="button-lime shrink-0">Get Juggle Dude</a> : <Link href="/support/" className="button-lime shrink-0">App & launch info</Link>}
        </div>
      </section>
    </main>
  );
}
