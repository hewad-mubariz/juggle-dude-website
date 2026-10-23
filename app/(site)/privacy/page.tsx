import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Juggle Dude handles videos, accounts, training results, and privacy requests.",
  robots: site.privacyApproved ? undefined : { index: false, follow: true },
};

export default function Privacy() {
  return (
    <ContentPage eyebrow={`Last updated ${site.policyDate}`} title="Privacy policy" intro="Your training videos are analysed on your phone. If you create an account, we store your profile and training results so you can use them across devices.">

      <h2>1. Who is responsible</h2>
      <p>Juggle Dude is operated by {site.operatorName}, an individual developer based in {site.operatorCity}, {site.operatorCountry}, who is the controller of the personal information described here. This policy covers the iPhone app and this website.</p>
      <p>For privacy questions or requests, contact <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. {site.supportEmailConfirmed ? "" : "This is the proposed contact address; mailbox availability has not yet been confirmed."} Postal contact details are on our <Link href="/imprint/">Impressum</Link>.</p>

      <h2>2. Camera, imported videos, and local replays</h2>
      <p>Camera access lets you record practice. The app analyses the ball, player position, and touches on your device. Training videos, analysis frames, and body-position analysis are not uploaded automatically. If you request a touch check, the app uploads the review clips you select so an authorised reviewer can check those moments. This analysis is for counting and video effects, not identifying you through facial recognition. Juggle Dude does not record microphone audio during camera sessions.</p>
      <p>You can select a video or profile image through the system photo picker. Exporting a clip to Photos requires your permission to add it. Original replay videos in app history are stored locally and excluded from device backups; they do not sync through your Juggle Dude account.</p>
      <p>A clip you export to Photos may sync using your own iCloud Photos settings. Sharing through another app sends the clip to the recipient or service you choose, under that service’s privacy rules.</p>

      <p><strong>Optional touch checks:</strong> review requests include selected video clips, recording timestamps, device flags, the requested streak, and account/session identifiers. Reviewers can confirm or reject the requested touches and record a reason and verified score. The decision is saved to your account. Review clips are private and are not published with your profile.</p>

      <h2>3. Guest mode and account information</h2>
      <p>You can practise as a guest without creating a Juggle Dude account. Guest training results and replays stay in a separate local library. Signing in later does not upload or automatically assign earlier guest sessions to your account. Apple may still process a Pro purchase if you subscribe as a guest.</p>
      <p>In this release, you can create an account using Sign in with Apple. If you create an account, we process:</p>
      <ul>
        <li><strong>Account information:</strong> a Juggle Dude account identifier, your Apple sign-in identifier, the email address Apple supplies when you authorise sign-in, and your name if Apple provides it. If you choose Hide My Email, we receive Apple’s private relay address instead of your personal email address.</li>
        <li><strong>Your chosen profile:</strong> display name, optional country, and optional profile photo. Profile photos are uploaded to account storage.</li>
        <li><strong>Training results:</strong> session identifier, touch count, duration, whether the session was recorded or imported, completion time, app and counter versions, and result eligibility or moderation status.</li>
        <li><strong>Service and support information:</strong> network request information, such as IP addresses and authentication or security events, processed by infrastructure providers; and information you send when requesting help.</li>
      </ul>
      <p>Our cloud database provider hosts account sign-in, the results database, profile-photo storage, and private review clips in the EU. Account results can load on another device. Small pending result records may be stored locally and retried when connectivity returns. Signing out does not delete the cloud account or its results.</p>

      <h3>Google and email sign-in, where offered</h3>
      <p>The first App Store release offers Sign in with Apple. Google and email sign-in are being prepared for other app versions and testing; availability depends on the options shown in your app.</p>
      <p>If you choose Google, we request only basic sign-in information: your Google account identifier, email address and verification status, name, and profile information such as your profile-photo URL. Google supplies this information to our authentication provider, Supabase, to create or identify your Juggle Dude account and establish a secure session. Authentication tokens are processed for sign-in and session management; the app stores its session securely in the iOS Keychain. We do not receive your Google password or request access to your Gmail messages, Google Drive files, contacts, or calendar.</p>
      <p>We use Google account information only to provide and secure your account and profile. It is not used for advertising, sold, or shared with other users. It is retained and deleted under the account-retention and account-deletion sections below. You can also remove Juggle Dude’s connection in your Google Account settings; doing so does not by itself delete your Juggle Dude account or cancel an Apple subscription.</p>
      <p>If you choose email sign-in, Supabase and Amazon Simple Email Service process your email address and sign-in message to deliver the link you requested. We do not use these sign-in emails for marketing. Never share a sign-in link or code with another person.</p>

      <h2>4. Why we use information</h2>
      <p>We use account and result information to sign you in, maintain your profile, and save training history and personal bests. Technical information supports delivering and securing the service, preventing abuse, and resolving failures. Support messages are used to respond to your request.</p>
      <p>We do not sell personal information, use advertising or cross-app tracking SDKs, or use your recordings or uploaded profile photos to train cloud AI models. The app does not include advertising SDKs. Usage analytics are optional, off by default, and only start if you turn them on (see section 5). The app does not request your contacts or GPS location; profile country is a choice you make.</p>

      <h2 id="analytics">5. Optional usage analytics</h2>
      <p>Usage analytics are off unless you choose to share them in Profile → Settings → Privacy → Share usage analytics. Until you turn this on, the app does not set up the analytics service or send it anything.</p>
      <p>If you turn it on, the app sends PostHog a limited set of usage events so we can see which features are used and where things go wrong. These events cover opening the app, sign-in attempts and their outcomes, starting and completing training, importing and exporting videos, choosing effects and graphs, viewing the Pro screen, and starting or finishing a purchase attempt. Events include whether an action succeeded, failed, or was cancelled, rounded durations, and the effect or plan chosen. PostHog also receives standard technical details such as app version, iOS version, device model, language and time zone. PostHog receives your IP address to deliver each request, but we have configured it to discard the address instead of storing it with events.</p>
      <p>Events are linked to a random identifier created for that installation of the app. They are not linked to your Juggle Dude account, account identifier, name, or email address. We do not send videos, images, profile photos, email addresses, sign-in links, or error messages. Automatic screen and tap capture, session recording, crash capture, and location lookup from IP addresses are switched off. We do not use analytics for advertising or cross-app tracking, and we do not combine them with data from other companies.</p>
      <p>You can turn sharing off at any time with the same switch to stop collecting new analytics events. Events already sent are not deleted by the switch and remain subject to our <a href="#retention">retention policy</a>. Because analytics are not linked to your account, we may be unable to identify your events from your name or email. You can <a href="#rights">contact us about your privacy rights</a>; we will act on requests under applicable law where the relevant records can be identified, including using additional information you provide.</p>

      <h2>6. Pro purchases</h2>
      <p>Apple processes payments and billing information through the App Store. Juggle Dude checks verified StoreKit transactions on your device to determine Pro access. If you are signed in when purchasing, your Juggle Dude account identifier is supplied to Apple as an app-account token associated with the purchase. We do not receive full card details.</p>
      <p>When you sign in with an active purchase, our account service verifies it with Apple and links it to your Juggle Dude account for subscription recovery. This can include a purchase you made earlier as a guest. The service stores the original purchase identifier, subscription product, status, relevant dates, test or production environment, and linked account identifier. We check current subscription status with Apple to handle renewals, expiry and refunds. Signed transaction receipts are processed for verification but are not retained in our subscription database. This processing provides Pro access and account recovery; it is not used for advertising or tracking.</p>
      <p>Apple handles subscription renewals, cancellation, and refund requests under its own terms. See our <Link href="/terms/">terms</Link> for subscription information.</p>

      <h2>7. Legal bases in the EEA</h2>
      <ul>
        <li><strong>Providing the service — Article 6(1)(b) GDPR:</strong> processing necessary to provide the account, profile, training history, and other features you request.</li>
        <li><strong>Legitimate interests — Article 6(1)(f):</strong> proportionate security, abuse prevention, service reliability, and support, balanced against your rights and expectations.</li>
        <li><strong>Consent — Article 6(1)(a) GDPR and § 25(1) TDDDG:</strong> optional usage analytics, including storing and reading the analytics identifier on your device. You can withdraw consent at any time without affecting earlier processing.</li>
        <li><strong>Legal obligations — Article 6(1)(c):</strong> retaining or disclosing information where applicable law requires it.</li>
      </ul>
      <p>Account information is needed only if you choose account features. Country and profile photo are optional. Device permissions can be withdrawn in iOS Settings; features needing that permission will then be unavailable. A device permission alone does not authorise unrelated processing.</p>

      <h2>8. Recipients, storage locations, and security</h2>
      <p>We use a small number of service providers who process information on our behalf and only on our instructions: a cloud database provider for accounts, results, profile photos, private review clips, and subscription links, hosted in the EU; a website hosting provider that also runs the private admin service; and email providers that receive and deliver support messages. If you turn on usage analytics, PostHog processes those events in its EU cloud, hosted in Frankfurt, Germany. Apple processes information for Sign in with Apple and handles purchases and subscription verification. Service providers acting on our behalf must be covered by appropriate confidentiality, security, and data-protection arrangements.</p>
      <p>For the additional sign-in options described in section 3, Google processes your Google sign-in under its own privacy policy, Supabase provides account authentication and storage, and Amazon Simple Email Service delivers requested sign-in emails from its Stockholm region.</p>
      <p>Some providers or their support teams may process information outside the EEA. Where that happens, we rely on an appropriate legal safeguard, such as an adequacy decision or standard contractual clauses. Contact us for the names of our providers and details of the safeguards that apply to your information.</p>
      <p>The app uses HTTPS for account requests, stores sign-in tokens in the iOS Keychain, and uses access controls for account records. No storage or transmission system can be guaranteed completely secure.</p>
      <p>We may disclose necessary information when legally required, or to establish, exercise, or defend legal claims. We do not give other users access to your private account history.</p>

      <h2 id="retention">9. How long information is kept</h2>
      <p>Local replay videos remain until you remove them or the app’s local storage is erased; they are not automatically evicted. Removing a replay in History removes the app’s local video, not its cloud result or a copy saved to Photos. Guest data remains local. Cloud account records are kept to provide your account until deletion, subject to necessary legal retention.</p>
      <p><strong>Touch-check records:</strong> review requests and decisions remain with your account until deletion. The review-storage cleanup rules mark pending or rejected videos for removal after 30 days without a new submission, decision, or appeal. Approved videos remain as review evidence until the request is withdrawn or the account is deleted. Marking a file for cleanup and removing the stored bytes are separate steps; provider copies follow the arrangements below.</p>
      <p><strong>Support conversations:</strong> we delete resolved support emails and attachments from our mailbox within {site.supportRetentionDays} days after your request is resolved. Messages needed to handle an ongoing request are kept while that request remains open. Where particular correspondence is necessary to comply with a legal obligation or establish, exercise, or defend a legal claim, we retain only what is needed for that purpose and delete it when that need ends.</p>
      <ul>
        <li><strong>Incoming email copies:</strong> temporary copies held by our email-receiving service are deleted automatically after 30 days.</li>
        <li><strong>Subscription links:</strong> verified subscription records remain linked to your account until you delete it, including after a subscription expires. Deleting the account removes these links from our account database; Apple retains its own billing records under its policies.</li>
        <li><strong>Technical and security logs:</strong> our providers keep short-lived request and sign-in logs for the limited period their service sets, then delete them.</li>
        <li><strong>Usage analytics:</strong> events are kept for one year and then deleted.</li>
        <li><strong>Backups:</strong> provider backup and recovery copies may hold deleted information for a limited time before it is overwritten.</li>
      </ul>
      <p>When information is deleted, copies in provider systems can take some time to be fully erased under each provider’s deletion process.</p>

      <h2 id="account-deletion">10. Removing your account</h2>
      <p className="whitespace-pre-line">{site.deletionInstructions}</p>
      <p>The deletion process removes your account identity, profile, uploaded profile photo, saved account results, and subscription links. The app clears that account’s local results, pending uploads, and replays after server confirmation; guest history and other accounts’ local libraries are kept. Separately retained support conversations and infrastructure logs follow the retention arrangements above. Optional analytics events are not linked to your account, so account deletion does not remove them. They follow the analytics retention period above; <a href="#analytics">section 5</a> explains analytics choices and the limits on identifying these records. You can also <a href="#rights">contact us to exercise your privacy rights</a>.</p>
      <p>Deleting a Juggle Dude account does not cancel an Apple subscription or remove clips exported to Photos or shared elsewhere. You can <a href="https://apps.apple.com/account/subscriptions/">manage or cancel your Apple subscription</a> separately.</p>

      <h2 id="rights">11. Your choices and rights</h2>
      <p>You can edit your profile, use guest mode, turn usage analytics on or off in Settings, and manage camera and Photos permissions. Under applicable data-protection law, you may request access, correction, erasure, restriction, or a portable copy of your information. You may object to processing based on legitimate interests and withdraw consent at any time.</p>
      <p>Send a request to <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. We may need proportionate information to verify account ownership; do not send passwords or sign-in codes. GDPR requests are normally answered within one month, with notice if a lawful extension is needed. You may complain to a data-protection supervisory authority, including the authority for the German state where you live or work. These rights can be subject to legal exceptions.</p>

      <h2>12. Children’s privacy</h2>
      <p>Guest practice does not require an account and keeps training data on the device. Account features and optional analytics involve the processing described in this policy. Children’s personal information receives additional protection under applicable law, including parental authorisation where required for consent-based processing.</p>
      <p>If you have concerns about a child’s information, contact <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. We will review the concern and take appropriate action under applicable law, including deleting information where required.</p>

      <h2>13. This website and policy updates</h2>
      <p>This website has no advertising, analytics trackers, or marketing cookies. Fonts and images are served with the site. Its host receives network information to deliver pages and may keep security logs; those arrangements are covered in the processing and retention details above. Your email provider and ours process messages when you contact support. The private admin area uses an essential sign-in cookie and server-side session records to restrict access to authorised reviewers; admin sessions expire after four hours. Public visitors do not need an admin cookie.</p>
      <p>We will update this policy when our practices change and show the date above. Material changes will be communicated appropriately before they take effect; new uses requiring consent will be subject to a new choice.</p>
    </ContentPage>
  );
}
