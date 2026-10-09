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

## Pages

- `/`: approved Clubhouse design, football imagery, app features, and download section.
- `/privacy/`: functionality-based privacy policy, clearly marked as a draft until approved.
- `/terms/`: adult eligibility, service terms, Apple’s standard EULA, and subscription information.
- `/support/`: recording tips, local video history, account and subscription help, and contact details.
- `/imprint/`: German operator/contact page; postal address remains unset until provided.

## Launch settings

Copy `.env.example` to `.env.local` and fill in the public settings. Rebuild after changing them; this is a static export.

| Setting | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Deployed HTTPS origin for sitemap and absolute metadata. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Proposed default: `hello@juggledude.com`; must be a real monitored mailbox. |
| `NEXT_PUBLIC_SUPPORT_EMAIL_CONFIRMED` | Set `true` after verifying incoming email and monitoring. |
| `NEXT_PUBLIC_OPERATOR_NAME` | Confirmed default: Hewad Mubariz, individual developer in Germany. |
| `NEXT_PUBLIC_CONTACT_ADDRESS` | Legally suitable public postal address. No home address is inferred or published. |
| `NEXT_PUBLIC_PROCESSING_DETAILS` | Verified providers, processing regions, and international-transfer arrangements. |
| `NEXT_PUBLIC_RETENTION_DETAILS` | Verified retention periods/criteria, deletion timing, backup expiry, and legal exceptions. |
| `NEXT_PUBLIC_DELETION_INSTRUCTIONS` | Actual tested in-app deletion process, scope, timing and confirmation. |
| `NEXT_PUBLIC_APP_STORE_URL` | Live App Store listing. Leave empty until available. |
| `NEXT_PUBLIC_PRIVACY_APPROVED` | Set `true` only after review. The confirmed mailbox, address, processing, retention and deletion settings are also required to remove policy/terms draft notices. This does not certify legal compliance or Apple approval. |

Run `npm run check:launch` to identify unfinished launch settings. It intentionally fails with the placeholder defaults. Normal builds and CI still succeed with defaults so the design can be reviewed before release.

All these values are public in the export, including an address configured through hosting environment variables. Never put secrets in them. Use quoted plain-language values for statements containing spaces; React renders them as text. For more detailed operational copy, edit the policy source and update the readiness checks together. Do not remove notices merely by filling fields with unverified plans.

The existing Apple app ID is `6820780610`; the iOS project’s release notes currently say the app is preparing for submission. This website therefore defaults to **Coming soon**, without a fake download button. There is no Android availability claim.

## Privacy draft

The copy is based on the iOS app’s current implementation: on-device video analysis and local replays, separate guest sessions, Supabase sign-in/profiles/avatars/results, optional leaderboard visibility, and Apple StoreKit subscriptions. Website pages do not authenticate visitors or connect to the app’s database. No app secrets, Supabase settings, account records, or user videos are included in this repository.

The confirmed audience is adults aged 18+. Before using the policy in App Store metadata, finish contact/address details, provider and transfer arrangements, retention schedules, account deletion, and release verification. The current iOS app has no account-deletion endpoint and its privacy links show placeholders. Policies describe these gaps honestly rather than inventing a working flow. No changes were made to the iOS app by this website update.

See [App Store review notes](docs/apple-review.md) for source evidence, app changes needed before submission, a working privacy-label inventory, German imprint and Apple trader contact distinctions, and final URL setup. The draft pages are excluded from search indexing. The site still needs hosting on a public HTTPS domain before it can serve as an App Store policy URL.

## Images

The approved generated football photographs are in `public/images/`. The built-in image generation prompts are recorded in `docs/image-generation.json`. They are illustrative marketing photography, not screenshots or footage from the app.

## CI

GitHub Actions installs from the committed lockfile, checks TypeScript, and builds the static website on pushes and pull requests. No hosting deployment or paid service is configured.

Reference implementation guidance: [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports) and [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
