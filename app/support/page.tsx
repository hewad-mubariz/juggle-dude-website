import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Support", description: "Help with recording, replay videos, accounts, and subscriptions in Juggle Dude." };

export default function Support() {
  return (
    <ContentPage eyebrow="A hand with the app" title="Keep playing." intro="A few tips to make your next session smoother. And a way to get in touch when you need a hand.">
      <Image src="/images/juggling-detail.jpg" width={900} height={600} sizes="(max-width: 850px) 89vw, 760px" alt="A football just above a white trainer during a juggling session" className="mb-9 h-56 w-full rounded-2xl object-cover sm:h-75" />
      <h2>Getting Juggle Dude</h2>
      <p>{site.appStoreUrl ? <>Juggle Dude is available for iPhone. <a href={site.appStoreUrl}>Open it on the App Store</a> to check compatibility and download the app.</> : "Juggle Dude is getting ready for the App Store. The download link will be added here when the app is available. It is being built for iPhone."}</p>
      <h2>Getting a clearer count</h2><ul><li>Keep the phone steady, with your feet and the ball in frame.</li><li>Use good lighting and give yourself enough room to play.</li><li>Watch the replay if a touch looks missed or counted twice.</li></ul>
      <h2>Finding your recordings</h2><p>Open History from Home or Profile to see recorded and imported sessions. Replays are stored on the phone where they were recorded. Signed-in account results can sync across devices; the original video does not.</p>
      <h2>Accounts and public profiles</h2><p>You can practise as a guest. Sign in to save account results and edit your profile. Leaderboard sharing is off by default and can be changed in your profile. See the <Link href="/privacy/">privacy policy</Link> for the current data practices.</p>
      <h2>Subscriptions and restoring purchases</h2><p>Open Juggle Dude Pro in Profile to see your status or restore purchases. To manage or cancel an Apple subscription, open Settings on your iPhone, tap your name, then Subscriptions. Use the Apple Account you purchased with.</p>
      <h2>Contact and privacy requests</h2>
      {site.supportEmail ? <p>Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. Include your app version, iPhone model, and a short description of the problem. Avoid sending sign-in codes, payment information, or other people’s recordings.</p> : <p>The support and privacy contact will be published here before launch. In the meantime, the tips above cover recording, account results, and subscriptions.</p>}
    </ContentPage>
  );
}
