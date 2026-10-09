import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use", description: "Using Juggle Dude, your recordings, automatic counts, and App Store subscriptions." };

export default function Terms() {
  return (
    <ContentPage eyebrow={`Last updated ${site.policyDate}`} title="Terms of use" intro="A few things to know about using Juggle Dude and sharing your football sessions.">
      <h2>The app licence</h2><p>The iPhone app uses <a href={site.appleEulaUrl}>Apple’s standard End User Licence Agreement</a>. These notes explain the app’s current features and subscription behaviour. Any additional service terms will be published before accounts launch publicly.</p>
      <h2>Counts and results</h2><p>Juggle Dude automatically analyses your football practice. Counts can miss or misidentify a touch. Review the replay when a result matters. Results are reported by the device and are not independently verified competition scores.</p>
      <h2>Your recordings</h2><p>You remain responsible for your recordings and what you choose to share. Only record other people with their permission, and avoid sharing information they expect to stay private. Practise somewhere safe and position your phone away from play.</p>
      <h2>Accounts and leaderboards</h2><p>Choose accurate account information and keep your sign-in access secure. Leaderboard participation is optional. Do not submit fabricated scores or use the service to harass another player. Our <Link href="/privacy/">privacy policy</Link> describes which profile details can be displayed.</p>
      <h2>Optional Pro subscriptions</h2><p>Monthly and yearly Pro subscriptions are handled through Apple. The app displays the current price, billing period, and available features before you purchase. Availability and prices can vary by country; this website does not quote a fixed price or promise a trial.</p><p>Subscriptions renew automatically unless cancelled at least 24 hours before the current period ends. Manage or cancel them in your iPhone’s Apple Account subscription settings. Use Restore purchases in the app to restore an existing purchase. Payment, refunds, and subscription management are subject to Apple’s applicable terms.</p>
      <h2>Getting help</h2><p>Visit <Link href="/support/">Support</Link> for recording tips and account or subscription information.</p>
    </ContentPage>
  );
}
