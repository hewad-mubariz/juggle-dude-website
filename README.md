# Juggle Dude website

The Clubhouse landing page for **Juggle Dude**, built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4. The correct public name is **Juggle Dude**; the project and repository name is `juggle-dude-website`.

## Run locally

Requires Node.js 22 or later and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Validate and preview a production build

```sh
npm run typecheck
npm run build
npm run preview
```

Open `http://localhost:4173`. `npm run preview -- 4200` selects a different port. The preview server is local development tooling, not a production server.

The app uses Next.js App Router and exports static pages to `out/`. A static host can serve that directory; Vercel can import this repository directly. Preserve directory index routing and use `404.html` for missing routes. The fonts are bundled by `next/font`, and generated photographs are local assets, so visitors do not need third-party font or image requests.

## Production hosting

The existing [Vercel project](https://vercel.com/hewad-finosucoms-projects/juggle-dude-website-8zwx) is connected to this repository's `main` branch. The primary website address is **https://juggledude.com**; `www.juggledude.com` redirects to it with HTTP 308. Production has `NEXT_PUBLIC_SITE_URL=https://juggledude.com` configured in Vercel and was rebuilt after that setting was added.

DNS remains managed at GoDaddy. The project-specific records confirmed on 9 October 2026 are:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `216.198.79.1` | 600 seconds |
| CNAME | `www` | `71e42daa1f6e19d2.vercel-dns-017.com.` | 1 hour |

Use the current Vercel Domains dashboard when making future changes; these targets can change. Nameservers and unrelated DNS records were preserved. Vercel manages the site's HTTPS certificates. The operator confirmed the separately configured support mailbox, `hello@juggledude.com`, is functional on 10 October 2026.

## Pages

- `/`: approved Clubhouse design, football imagery, app features, and download section.
- `/privacy/`: functionality-based privacy policy with verified provider details, retention criteria, and deletion instructions. Internal review reminders are kept in `docs/apple-review.md`.
- `/terms/`: adult eligibility, service terms, Apple’s standard EULA, and subscription information.
- `/support/`: recording tips, local video history, account and subscription help, and contact details.
- `/imprint/`: German operator/contact page with the operator's supplied postal address.
- `/auth/email/`: retained compatibility fallback for previously issued development email links; email sign-in is not offered in this release.

## Retained development email-link support

The current release offers **Sign in with Apple and guest practice**. Google and email sign-in controls are commented out in the iOS main sign-in view, as confirmed against source on 10 October 2026. Existing backend methods and the website email-link route remain for compatibility/development; this does not make them public sign-in choices. The no-token fallback now directs people to Apple or guest practice instead of telling them to request an unavailable email link.

`/.well-known/apple-app-site-association` associates only `/auth/email/` and `/auth/email` with `G276PSQ2LH.com.juggledude`. Vercel serves this extensionless file as JSON without a redirect. The app must be signed with `applinks:juggledude.com` in its Associated Domains entitlement; Apple fetches and caches the association when the app is installed or updated.

Supabase email buttons use `https://juggledude.com/auth/email/#token_hash={{ .TokenHash }}&type=magiclink` (or `type=signup` for signup confirmation). The iOS app verifies the token with Supabase and exchanges the result using its original PKCE verifier. This website never verifies a token or creates a session.

The secret stays in the URL fragment, which browsers do not send to the web server. The fallback removes it from the visible browser history, validates it locally, and provides an explicit Open Juggle Dude button. It does not automatically trigger a custom scheme, make authentication requests, store the token, or run analytics. That fallback button may require the browser's app-opening confirmation; the primary Universal Link route is handled directly by iOS. Other pages and legal copy remain independent of sign-in.

Run `npm run test:email-link` for malformed-token, duplicate-parameter, route and app-ID checks. Also verify the deployed AASA returns HTTP 200 with `Content-Type: application/json`, then test a fresh email on the updated iPhone. Email-client link wrappers and user browser preferences can still affect opening behavior.

## Launch settings

Copy `.env.example` to `.env.local` and fill in the public settings. Rebuild after changing them; this is a static export.

| Setting | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Deployed HTTPS origin for sitemap and absolute metadata. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Confirmed default: `hello@juggledude.com`. |
| `NEXT_PUBLIC_SUPPORT_EMAIL_CONFIRMED` | Defaults to confirmed for the supplied mailbox. A replacement needs its own confirmation; an explicit `false` restores pending notices. |
| `NEXT_PUBLIC_OPERATOR_NAME` | Confirmed default: Hewad Mubariz, individual developer in Mainz, Germany. |
| `NEXT_PUBLIC_CONTACT_ADDRESS` | Optional public postal-address override; defaults to the address supplied for publication by the operator. |
| `NEXT_PUBLIC_PROCESSING_DETAILS` | Optional override of verified providers/regions in source. Review applicable processor and transfer arrangements before final approval. |
| `NEXT_PUBLIC_RETENTION_DETAILS` | Optional override of provider-managed retention criteria in source; configured account/email periods and the adopted support rule are also documented in the policy. |
| `NEXT_PUBLIC_DELETION_INSTRUCTIONS` | Optional override of the implemented Profile → Delete account instructions. |
| `NEXT_PUBLIC_APP_STORE_URL` | Live App Store listing. Leave empty until available. |
| `NEXT_PUBLIC_PRIVACY_APPROVED` | Set `true` only after review. The confirmed mailbox, address, processing, retention and deletion details are also required to enable privacy-page indexing. This is an internal publication check; it does not insert public review banners. This does not certify legal compliance or Apple approval. |

Run `npm run check:launch` to identify unfinished launch settings. It identifies unfinished internal privacy approval and App Store listing settings. Provider locations, retention criteria and deletion instructions have source defaults and no longer require environment placeholders. An unavailable App Store listing does not prevent hosting the legal pages. Normal builds and CI still succeed with defaults so the design can be reviewed before release.

All these values are public in the export, including an address configured through hosting environment variables. Never put secrets in them. Use quoted plain-language values for statements containing spaces; React renders them as text. For more detailed operational copy, edit the policy source and update the readiness checks together. Do not remove notices merely by filling fields with unverified plans.

The existing Apple app ID is `6820780610`; the iOS project’s release notes currently say the app is preparing for submission. This website therefore defaults to **Coming soon**, without a fake download button. There is no Android availability claim.

## Privacy publication status

The copy is based on the iOS app’s current implementation: on-device video analysis and local replays, separate guest sessions, Sign in with Apple through Supabase, account profiles/avatars/results, optional leaderboard visibility, and Apple StoreKit subscriptions. Website pages do not authenticate visitors or connect to the app’s database. No app secrets, Supabase settings, account records, or user videos are included in this repository.

Marketing and privacy copy use neutral wording; the service terms retain the current 18+ eligibility rule. The operator's postal address and confirmed mailbox are published. The terms and Impressum no longer depend on unfinished privacy-retention settings for publication or search indexing.

The 10 October 2026 audit confirmed Supabase in Ireland, Vercel hosting, SES support receiving and forwarding in Stockholm, Gmail forwarding, and 30-day S3 message expiry/CloudWatch forwarding-log retention. Auth audit logging into the database is disabled. The current Supabase Free plan has no scheduled project backups; its published API/database and Auth audit-log retention are documented in the policy. These facts do not establish that all processing is EEA-only or that provider recovery copies disappear immediately.

Account deletion and live legal links are implemented in the iOS app. The shared website instructions now describe Profile → Delete account, Apple reauthorisation where needed, server confirmation, and local cleanup. The app's deletion notes still require a successful real-device test with a disposable account and Apple revocation before submission. No iOS or backend changes were made for this website update.

On 10 October 2026, the operator adopted a manual rule to delete resolved Gmail support conversations and attachments within 90 days of resolution, with necessary legal-obligation/claim exceptions. The practical review/deletion routine is recorded in `docs/apple-review.md`; no mailbox automation or email deletion was performed. The public privacy page now explains provider-managed retention using the providers' published criteria, without internal draft or review notices. Vercel's own service-generated information follows its published purpose-based retention policy. Google's deletion process and possible encrypted backup retention are attributed to Google, rather than treated as a deadline for every provider. No universal immediate-purge or fixed recovery-copy expiry is promised.

Provider processor/transfer arrangements and final app release checks remain in [App Store review notes](docs/apple-review.md). `NEXT_PUBLIC_PRIVACY_APPROVED` remains an internal approval/indexing flag; removing a public reminder does not approve those operational checks. The policy remains accessible at its public HTTPS URL even while search indexing is disabled.

## Images

The approved generated football photographs are in `public/images/`. The built-in image generation prompts are recorded in `docs/image-generation.json`. They are illustrative marketing photography, not screenshots or footage from the app.

## CI

GitHub Actions installs from the committed lockfile, checks TypeScript, and builds the static website on pushes and pull requests. Vercel's existing GitHub integration handles production deployment independently of this workflow. No paid plan or additional service was purchased by this setup.

Reference implementation guidance: [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports) and [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
