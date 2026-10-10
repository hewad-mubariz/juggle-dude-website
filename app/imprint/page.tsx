import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Operator and legal contact information for Juggle Dude.",
  robots: site.contactAddress && site.supportEmailConfirmed ? undefined : { index: false, follow: true },
};

export default function Imprint() {
  return (
    <ContentPage eyebrow="Operator information" title="Impressum" intro="Legal contact information for Juggle Dude.">
      {(!site.contactAddress || !site.supportEmailConfirmed) && <aside className="notice"><p><strong>Pre-launch draft.</strong> The postal contact address and working email must be completed and verified before commercial publication.</p></aside>}
      <h2>Service provider / Diensteanbieter</h2>
      <p>{site.operatorName}<br />Juggle Dude<br />{site.operatorCity}, {site.operatorCountry}</p>
      <h2>Postal address / Anschrift</h2>
      {site.contactAddress ? <p className="whitespace-pre-line">{site.contactAddress}</p> : <p>A legally suitable postal address has not yet been provided.</p>}
      <h2>Contact / Kontakt</h2>
      <p>Email: <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>{!site.supportEmailConfirmed && <><br />Proposed address — mailbox availability is not yet confirmed.</>}</p>
    </ContentPage>
  );
}
