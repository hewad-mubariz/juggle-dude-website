import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", description: "How Juggle Dude handles recordings, accounts, session results, profiles, and subscriptions.", robots: site.privacyApproved ? undefined : { index: false, follow: true } };

export default function Privacy() {
  return (
    <ContentPage eyebrow={`Last updated ${site.policyDate}`} title="Privacy policy" intro="Your football recordings stay on your phone. Accounts and saved results work a little differently—here’s what that means.">
      {!site.privacyApproved && <aside className="notice" aria-label="Draft policy notice"><p><strong>Draft for review.</strong> The operator’s contact details, account retention and deletion process, hosting arrangements, and international data transfer details must be confirmed before this policy is used for the public app launch.</p></aside>}
      <h2>Who operates Juggle Dude</h2>
      <p>{site.operatorName ? `Juggle Dude is operated by ${site.operatorName}.` : "Operator details will be added before launch."} {site.supportEmail ? <>For privacy questions, email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.</> : <>The privacy contact will be published on our <Link href="/support/">support page</Link> before launch.</>}</p>
      <h2>Your recordings and camera access</h2>
      <p>Juggle Dude uses your camera to record football practice and analyse the ball and your touches on your device. The app’s account services do not upload your recordings or analysis frames. Original replays are stored locally, and recorded replay videos in the app’s history are excluded from device backups.</p>
      <p>If you import a video or save an exported clip to Photos, you choose that action and grant the relevant permission. Clips saved in your photo library may sync through your own iCloud Photos settings. If you share a clip, the service you choose handles it under its own terms and privacy policy.</p>
      <h2>Guest practice</h2>
      <p>You can train as a guest. Guest sessions and records remain in a separate local library. They are not uploaded or automatically assigned to an account when you later sign in.</p>
      <h2>Accounts, profiles, and results</h2>
      <p>When you sign in with Apple, Google, or an email link, Supabase Auth handles your account identity, email, and information supplied by the sign-in provider. Sign-in tokens are stored in the device’s Keychain.</p>
      <p>The account service stores:</p>
      <ul><li>Your account identifier, display name, optional country, optional profile photo, and leaderboard visibility setting.</li><li>Saved session results: touch count, duration, recorded or imported source, completion time, and app and counter versions.</li><li>Identifiers needed to associate a result with your account and avoid saving it twice.</li></ul>
      <p>These records let the app save your results, load your history and personal best, and show the leaderboard when you choose to participate. Account results can be available on another device; your locally stored replay videos do not sync through the account service.</p>
      <h2>Leaderboard visibility</h2>
      <p>Sharing is off by default. If you enable it, your chosen display name, optional country and avatar, and eligible scores may appear publicly in the leaderboard. Your email and sign-in provider details are not shown on it.</p>
      <p>Turning sharing off removes you from new leaderboard queries. Previously issued avatar download links can remain usable for up to five minutes.</p>
      <h2>Pro subscriptions</h2>
      <p>Apple handles purchases and payment information through the App Store. Juggle Dude uses verified StoreKit transactions to determine your Pro access. If you are signed in, an account identifier may be attached to a transaction to associate it with your account. The app does not receive your full payment card details.</p>
      <h2>Service providers and website visits</h2>
      <p>Supabase provides the app’s authentication, account database, and avatar storage. Apple and Google process information when you choose their sign-in services. Apple also processes subscription transactions.</p>
      <p>This website does not include advertising, third-party analytics, or marketing cookies. The website’s hosting provider may process IP addresses and request information to deliver and secure the site. Contacting support shares the information you include with the support operator and their email provider.</p>
      <h2>Keeping and removing data</h2>
      <p>You can remove completed local replays from the app’s History screen. This removes the local replay, not its saved account result or a copy in Photos. Local replay videos are not automatically evicted. Account retention periods, the support retention period, and the process for deleting an account and its stored records must be finalised before launch.</p>
      <h2>Your choices and privacy rights</h2>
      <p>You can use guest mode, choose the profile information you provide, switch off leaderboard visibility, and manage camera and photo permissions in iOS Settings. Depending on where you live, you may have rights to access, correct, erase, or receive a copy of your personal information, object to certain processing, and complain to your local data protection authority.</p>
      <p>The applicable legal bases, retention periods, and safeguards for processing data outside your country will be documented in the final policy. Use the support contact for privacy requests once it is published.</p>
      <h2>Changes to this policy</h2>
      <p>We will update this page when the app’s data practices change and show the updated date above.</p>
    </ContentPage>
  );
}
