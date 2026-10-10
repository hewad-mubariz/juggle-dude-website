import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Juggle Dude handles videos, accounts, training results, public profiles, and privacy requests.",
  robots: site.privacyApproved ? undefined : { index: false, follow: true },
};

export default function Privacy() {
  return (
    <ContentPage eyebrow={`Last updated ${site.policyDate}`} title="Privacy policy" intro="Your training videos are analysed on your phone. If you create an account, we store your profile and training results so you can use them across devices.">
      {!site.privacyApproved && <aside className="notice" aria-label="Privacy publication status"><p><strong>Privacy details being finalised.</strong> The operator contact details, provider locations, and in-app account-deletion process are documented below. The remaining review covers {!site.supportEmailConfirmed && "the contact mailbox, "}support-mail and hosting-log retention, and the applicable provider data-protection and international-transfer arrangements.</p></aside>}

      <h2>1. Who is responsible</h2>
      <p>Juggle Dude is operated by {site.operatorName}, an individual developer based in {site.operatorCity}, {site.operatorCountry}, who is the controller of the personal information described here. This policy covers the iPhone app and this website.</p>
      <p>For privacy questions or requests, contact <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. {site.supportEmailConfirmed ? "" : "This is the proposed contact address; mailbox availability has not yet been confirmed."} Postal contact details are on our <Link href="/imprint/">Impressum</Link>.</p>

      <h2>2. Camera, imported videos, and local replays</h2>
      <p>Camera access lets you record practice. The app analyses the ball, player position, and touches on your device. Its account service does not upload training videos, analysis frames, or body-position analysis. This analysis is for counting and video effects, not identifying you through facial recognition. Juggle Dude does not record microphone audio during camera sessions.</p>
      <p>You can select a video or profile image through the system photo picker. Exporting a clip to Photos requires your permission to add it. Original replay videos in app history are stored locally and excluded from device backups; they do not sync through your Juggle Dude account.</p>
      <p>A clip you export to Photos may sync using your own iCloud Photos settings. Sharing through another app sends the clip to the recipient or service you choose, under that service’s privacy rules.</p>

      <h2>3. Guest mode and account information</h2>
      <p>You can practise as a guest without creating a Juggle Dude account. Guest training results and replays stay in a separate local library. Signing in later does not upload or automatically assign earlier guest sessions to your account. Apple may still process a Pro purchase if you subscribe as a guest.</p>
      <p>If you create an account using Apple, Google, or an email sign-in link, we process:</p>
      <ul>
        <li><strong>Account information:</strong> an account identifier, email address, sign-in provider, and identity information supplied by that provider, which may include a name or profile metadata. Apple’s private relay address can be used when you choose Hide My Email.</li>
        <li><strong>Your chosen profile:</strong> display name, optional country, optional profile photo, and leaderboard-sharing setting. Profile photos are uploaded to account storage.</li>
        <li><strong>Training results:</strong> session identifier, touch count, duration, whether the session was recorded or imported, completion time, app and counter versions, and result eligibility or moderation status.</li>
        <li><strong>Service and support information:</strong> network request information, such as IP addresses and authentication or security events, processed by infrastructure providers; and information you send when requesting help.</li>
      </ul>
      <p>Supabase provides account authentication, the results database, and profile-photo storage. Account results can load on another device. Small pending result records may be stored locally and retried when connectivity returns. Signing out does not delete the cloud account or its results.</p>

      <h2>4. Why we use information</h2>
      <p>We use account and result information to sign you in, maintain your profile, save training history and personal bests, and provide the leaderboard you choose to join. Technical information supports delivering and securing the service, preventing abuse, and resolving failures. Support messages are used to respond to your request.</p>
      <p>We do not sell personal information, use advertising or cross-app tracking SDKs, or use your recordings or uploaded profile photos to train cloud AI models. The current app does not include third-party advertising or analytics SDKs. It does not request your contacts or GPS location; profile country is a choice you make.</p>

      <h2>5. Optional public leaderboard</h2>
      <p>Public sharing is off by default. If you enable it, other people can see your chosen display name, optional country and profile photo, eligible recorded-session score, and rank. Imported-video results are not eligible for the leaderboard. Your email and sign-in provider details are not displayed.</p>
      <p>You can switch sharing off in your profile. This removes you from new leaderboard queries and prevents new public profile-photo links. Previously issued photo links can remain usable for up to five minutes. We cannot remove screenshots or copies other people made while your profile was public.</p>

      <h2>6. Pro purchases</h2>
      <p>Apple processes payments and billing information through the App Store. Juggle Dude checks verified StoreKit transactions on your device to determine Pro access. If you are signed in, your account identifier is supplied to Apple as an app-account token associated with the purchase. We do not receive full card details.</p>
      <p>Apple handles subscription renewals, cancellation, and refund requests under its own terms. See our <Link href="/terms/">terms</Link> for subscription information.</p>

      <h2>7. Legal bases in the EEA</h2>
      <ul>
        <li><strong>Providing the service — Article 6(1)(b) GDPR:</strong> processing necessary to provide the account, profile, training history, and other features you request.</li>
        <li><strong>Your consent — Article 6(1)(a):</strong> publishing your optional leaderboard profile. You can withdraw this consent by turning sharing off, without affecting processing that was lawful before withdrawal.</li>
        <li><strong>Legitimate interests — Article 6(1)(f):</strong> proportionate security, abuse prevention, service reliability, and support, balanced against your rights and expectations.</li>
        <li><strong>Legal obligations — Article 6(1)(c):</strong> retaining or disclosing information where applicable law requires it.</li>
      </ul>
      <p>Account information is needed only if you choose account features. Country, profile photo, and public leaderboard participation are optional. Device permissions can be withdrawn in iOS Settings; features needing that permission will then be unavailable. A device permission alone does not authorise unrelated processing.</p>

      <h2>8. Recipients, storage locations, and security</h2>
      <p>Supabase processes account records and profile photos for us. Apple and Google also process information when you use their sign-in services, and Apple handles purchases. Website hosting and email providers process information needed to deliver the website and support. Service providers acting on our behalf must be covered by appropriate confidentiality, security, and data-protection arrangements.</p>
      <p className="whitespace-pre-line">{site.processingDetails}</p>
      <p>Where information is transferred outside the EEA, an applicable legal safeguard is required, such as an adequacy decision or standard contractual clauses with any necessary additional measures. Contact us for details of the safeguards applicable to your information.</p>
      <p>Provider information is available in <a href="https://supabase.com/legal/customer-resources/data-processing-addendum">Supabase’s data-processing addendum</a>, <a href="https://vercel.com/legal/dpa">Vercel’s data-processing addendum</a>, and <a href="https://policies.google.com/privacy/frameworks">Google’s transfer-framework information</a>. These documents describe the providers’ arrangements; a European project region alone does not establish the safeguards for every service we use.</p>
      <p>The app uses HTTPS for account requests, stores sign-in tokens in the iOS Keychain, and restricts account records to the signed-in owner, except for the public profile information you choose to share. No storage or transmission system can be guaranteed completely secure.</p>
      <p>We may disclose necessary information when legally required, or to establish, exercise, or defend legal claims. We do not give other users access to your private account history.</p>

      <h2>9. How long information is kept</h2>
      <p>Local replay videos remain until you remove them or the app’s local storage is erased; they are not automatically evicted. Removing a replay in History removes the app’s local video, not its cloud result or a copy saved to Photos. Guest data remains local. Cloud account records are kept to provide your account until deletion, subject to necessary legal retention.</p>
      <ul>
        <li><strong>Temporary received email:</strong> the S3 receiving bucket is configured to expire message copies after 30 days. Mail-forwarding logs in AWS CloudWatch also have a 30-day retention setting. These settings do not delete the forwarded Gmail conversation.</li>
        <li><strong>Account-service logs:</strong> the current Supabase Free plan lists one day of API/database log retention and one hour of Auth audit-log retention. Writing additional Auth audit logs into the account database is disabled.</li>
        <li><strong>Project backups:</strong> the current Supabase plan does not include scheduled project backups. This is separate from a provider’s internal infrastructure recovery arrangements and does not mean every provider copy is erased immediately.</li>
      </ul>
      {site.retentionDetails ? <p className="whitespace-pre-line">{site.retentionDetails}</p> : <aside className="notice"><p><strong>Remaining retention review:</strong> the retention rules for forwarded support conversations, website-host security logs, and any separately retained legal records or provider recovery copies are still being confirmed. We do not yet promise a fixed expiry period for those categories.</p></aside>}

      <h2 id="account-deletion">10. Removing your account</h2>
      <p className="whitespace-pre-line">{site.deletionInstructions}</p>
      <p>The deletion process removes your account identity, profile, uploaded profile photo, and saved account results. It also removes your profile from the leaderboard. The app clears that account’s local results, pending uploads, and replays after server confirmation; guest history and other accounts’ local libraries are kept. Separately retained support conversations and infrastructure logs follow the retention arrangements above. You can also contact us to exercise your privacy rights.</p>
      <p>Deleting a Juggle Dude account does not cancel an Apple subscription or remove clips exported to Photos or shared elsewhere. You can <a href="https://apps.apple.com/account/subscriptions/">manage or cancel your Apple subscription</a> separately.</p>

      <h2 id="rights">11. Your choices and rights</h2>
      <p>You can edit your profile, turn public sharing off, use guest mode, and manage camera and Photos permissions. Under applicable data-protection law, you may request access, correction, erasure, restriction, or a portable copy of your information. You may object to processing based on legitimate interests and withdraw consent at any time.</p>
      <p>Send a request to <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. We may need proportionate information to verify account ownership; do not send passwords or sign-in codes. GDPR requests are normally answered within one month, with notice if a lawful extension is needed. You may complain to a data-protection supervisory authority, including the authority for the German state where you live or work. These rights can be subject to legal exceptions.</p>

      <h2>12. Account eligibility</h2>
      <p>Our <Link href="/terms/">terms of use</Link> explain who may use Juggle Dude and create an account. If you believe someone who does not meet those requirements has provided account information, contact us so we can investigate and arrange appropriate removal.</p>

      <h2>13. This website and policy updates</h2>
      <p>This website has no advertising, analytics trackers, or marketing cookies. Fonts and images are served with the site. Its host receives network information to deliver pages and may keep security logs; those arrangements are covered in the processing and retention details above. Your email provider and ours process messages when you contact support.</p>
      <p>We will update this policy when our practices change and show the date above. Material changes will be communicated appropriately before they take effect; new uses requiring consent will be subject to a new choice.</p>
    </ContentPage>
  );
}
