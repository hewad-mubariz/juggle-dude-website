import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Juggle Dude account terms, age requirements, recordings, account content, and Apple subscriptions.",
  robots: site.operatorDetailsReady ? undefined : { index: false, follow: true },
};

export default function Terms() {
  return (
    <ContentPage eyebrow={`Last updated ${site.policyDate}`} title="Terms of use" intro="These terms explain using Juggle Dude, taking care of your account, and managing an optional Pro subscription.">
      {!site.operatorDetailsReady && <aside className="notice"><p><strong>Contact details pending.</strong> The operator’s postal address and working contact mailbox must be confirmed.</p></aside>}

      <h2>1. Operator, eligibility, and licence</h2>
      <p>Juggle Dude is operated by {site.operatorName}, based in {site.operatorCountry}. Contact <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>; postal contact details are on the <Link href="/imprint/">Impressum</Link>. {site.supportEmailConfirmed ? "" : "The proposed mailbox has not yet been confirmed active."}</p>
      <p>Anyone can practise as a guest. You must be at least {site.minimumAge} to create an account or share usage analytics. If you are under {site.parentalConsentAge}, you need permission from a parent or guardian to do either. These service terms cover accounts, training features, and related services. The iPhone app’s software licence is governed by <a href={site.appleEulaUrl}>Apple’s standard End User Licence Agreement</a>. Mandatory consumer rights remain unaffected.</p>

      <h2>2. Training, counts, and safe use</h2>
      <p>Juggle Dude analyses recorded or selected football videos, estimates touches, and lets you review sessions. Automatic counts can miss or misidentify touches. Results are reported by the device and are not independently verified competition scores. Review a replay when a result matters.</p>
      <p>Practise somewhere safe, allow enough space, and place your phone away from play. The app is a training companion; it does not provide medical advice, professional coaching, or a guarantee of sporting results.</p>

      <h2>3. Guest use and accounts</h2>
      <p>Guest practice does not require a Juggle Dude account. In this release, account creation and sign-in use Sign in with Apple. Keep access to your Apple Account secure and do not impersonate others. Tell us if you believe your Juggle Dude account has been misused.</p>
      <p>Signed-in results and profile information can be stored online. Guest history is separate and is not automatically transferred when you sign in. Replay videos remain on the device where they were saved; an account does not provide a cloud backup of those videos.</p>
      <p>The <Link href="/privacy/">privacy policy</Link> explains processing and your choices.</p>

      <h2>4. Your recordings and account content</h2>
      <p>You keep ownership of your recordings and uploaded content. Only record, upload, or share content you have the right to use, respecting other people’s privacy and permissions.</p>
      <p>For content you submit to the account service, you give us permission to store, process, and display it only as needed to provide the features you request, such as your account profile and saved training history. This permission does not authorise using your content for advertising or training cloud AI models.</p>
      <p>Do not upload unlawful or offensive content, harass people, impersonate someone, fabricate scores, or interfere with account security or service operation.</p>
      <p>We may remove unlawful or abusive uploaded content or restrict accounts for serious misuse. Where appropriate, we will explain the reason and provide a way to contest a decision through support, subject to legal or security restrictions.</p>

      <h2>5. Optional Juggle Dude Pro</h2>
      <p>Pro is offered through Apple as a monthly or yearly auto-renewing subscription. Before purchase, the app must show the actual available benefits, price, billing period, and renewal terms for your selected plan. Prices and availability can vary by storefront. A trial or introductory offer applies only if it is expressly shown in Apple’s purchase flow.</p>
      <p>Payment is charged to your Apple Account when the purchase is confirmed. Subscriptions renew automatically unless cancelled at least 24 hours before the current period ends. Apple may charge for renewal within the 24 hours before that period ends, at the renewal price shown under Apple’s terms.</p>
      <p><a href="https://apps.apple.com/account/subscriptions/">Manage or cancel your subscription through Apple</a>, or open iPhone Settings, tap your name, then Subscriptions. Cancellation normally stops the next renewal, with access continuing for the paid period. Use Restore purchases in Juggle Dude with the Apple Account used to purchase. Pro can be purchased without creating a Juggle Dude account.</p>
      <p>Signing in with an active purchase can link it to one Juggle Dude account for account-based recovery after online verification with Apple. This also applies to purchases made earlier as a guest. A purchase already linked to another Juggle Dude account cannot be reassigned automatically. Deleting your Juggle Dude account removes the account link but does not cancel Apple billing or remove a valid purchase from your Apple Account.</p>
      <p>Apple manages billing and refund requests. You can <a href="https://support.apple.com/118223">request a refund through Apple</a>; eligibility is determined under its policies and applicable law. Your statutory rights are not limited by these terms.</p>

      <h2>6. Leaving the service and deleting data</h2>
      <p className="whitespace-pre-line">{site.deletionInstructions}</p>
      <p>Signing out, deleting the app, or deleting a Juggle Dude account does not cancel an Apple subscription. Manage it separately through Apple. Account deletion also does not remove exported Photos clips or copies shared elsewhere. You may remove a completed local replay in History; its saved account result remains unless separately deleted.</p>

      <h2>7. Availability and changes</h2>
      <p>Online features need connectivity and can be interrupted by maintenance or failures. We will make reasonable efforts to maintain the service. Changes to paid features or these terms must respect applicable consumer law, existing purchase commitments, and any required notice or remedies.</p>
      <p>Nothing here excludes liability or remedies that cannot lawfully be excluded, including liability for intentional misconduct, gross negligence, or injury to life, body, or health. Mandatory warranty, cancellation, and other consumer rights remain in force.</p>

      <h2>8. Help and complaints</h2>
      <p>For technical help, account issues, content complaints, or questions about these terms, visit <Link href="/support/">Support</Link> or email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. Include enough detail to identify the issue, without sending passwords or sign-in codes.</p>
    </ContentPage>
  );
}
