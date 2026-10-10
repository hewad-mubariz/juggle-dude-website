# Juggle Dude policy and App Store review notes

Updated 10 October 2026 against the current iOS source in the sibling `kicklab` project. This is a release preparation document, not a guarantee of approval. The website describes the observed implementation and identifies the remaining privacy operational review. Marketing and privacy copy use neutral wording; the service terms retain the current eligibility rule. No iOS or production-backend changes were made for this website update.

## Confirmed operator details and unfinished publication details

- Operator: **Hewad Mubariz**, individual developer based in **Mainz, Germany** (city confirmed 10 October 2026).
- Minimum age: **18**. This is a product decision; the current sign-in flow does not yet enforce it.
- Support/privacy contact: **hello@juggledude.com**, confirmed functional by the operator on 10 October 2026. The default mailbox is marked confirmed; any replacement needs its own confirmation.
- The full postal address supplied by the operator for publication on 10 October 2026 is included in the Impressum, using the default in `lib/site.ts`. `NEXT_PUBLIC_CONTACT_ADDRESS` can override it when needed. All `NEXT_PUBLIC_*` values become public in the generated website.
- Production dashboards confirmed Supabase **West EU (Ireland), eu-west-1**, on the Free plan, and Vercel website hosting. Amazon SES support receiving uses **Europe (Stockholm), eu-north-1**, S3 storage and Lambda forwarding to Gmail. The receipt rule explicitly includes `hello@juggledude.com`.
- The S3 message bucket has enabled 30-day expiry; the forwarding Lambda's CloudWatch log group has 30-day retention. These settings do not delete Gmail copies. The forwarded-mail retention practice is awaiting operator confirmation.
- Supabase's dashboard has **Write audit logs to the database disabled** and no scheduled project backups on the current plan. Its current [pricing information](https://supabase.com/pricing) lists one day for API/database logs and one hour for Auth audit logs. Do not treat these published log periods as proof of immediate erasure of every internal provider copy or pre-existing database audit entry.
- Applicable provider processor/transfer arrangements, hosting/security-log and recovery-copy retention, and any separate legal-retention exceptions still need confirmation. European project locations are not proof of EU-only processing.

For a commercial German digital service, [§5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html) generally requires a readily accessible name, postal address, and electronic contact. A service address must satisfy the actual legal requirements; a mailbox-only forwarding arrangement should not be assumed sufficient. Add register or VAT/business identification details if applicable; do not publish a personal tax number.

Apple separately requires traders distributing in the EU to provide verified public contact details. For individual traders, Apple's flow accepts an address or PO box, plus phone and email. That does not establish that a PO box satisfies the German website requirement. The developer must make the trader assessment and supply verified details in App Store Connect. [Apple trader guidance](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)

## Evidence from the app

| Implementation | Policy consequence |
| --- | --- |
| `docs/player-data.md`, `Profile/PlayerData.swift`, `Profile/PlayerStore.swift` | Cloud session metadata, private account history, optional public profiles; no training-video uploads. Guest history remains local and separate. |
| `Account/AccountService.swift`, `Account/AccountStore.swift` | Supabase Apple/Google/email identity, provider metadata and device Keychain tokens. Account deletion now exists; see the deletion evidence below. |
| `Profile/CloudProfileEditor.swift`, account database migration | Optional name/country/avatar; sharing off by default; signed avatar URLs expire in five minutes. The deployed deletion endpoint explicitly removes avatar Storage bytes. |
| `Detection/CameraSession.swift`, `Recorder.swift`, Xcode permission strings | Video capture and local analysis; no microphone capture observed; user-directed Photos export. |
| `Pro/SubscriptionStore.swift`, `ProOffer.swift`, `docs/subscriptions.md` | StoreKit monthly/yearly plans, restore/manage, on-device entitlement checks; signed-in account UUID sent as app-account token. Final Pro feature gating remains unfinished. |
| `Account/SignInView.swift`, `Pro/ProPaywallView.swift` | Legal links now open the live HTTPS privacy and terms pages; Apple's standard EULA remains the software licence. |

Paths in this table are relative to the iOS project (`kicklab/` for Swift files). Inspect the submitted build again if app functionality changes.

## App work required before submission

1. **Account deletion — implemented, final live test outstanding:** `Account/AccountDeletion.swift`, `Home/TrainingProfileView.swift`, `supabase/functions/delete-account/index.ts` and `docs/account-deletion.md` show Profile → Delete account, confirmation, fresh Apple authorisation/revocation, explicit avatar cleanup, Auth hard deletion with profile/session cascades, and local account cache/outbox/replay cleanup after server confirmation. The function and migration are deployed to production. Unit, isolated UI, endpoint and database tests are documented; the app notes still record no successful authenticated disposable-account deletion or real Apple revocation test. Complete that on a real device before submission. Preserve guest history, other account libraries and Photos exports; cancellation of an Apple subscription is separate. [Apple deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
2. **Legal links — implemented:** the sign-in/paywall links open `https://juggledude.com/privacy/` and `/terms/`. The website is already hosted on HTTPS. Keep Apple's standard EULA for the software licence. Verify the final submitted build, settings access and App Store Connect URLs. [Apple standard EULA](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/)
3. **Public profiles:** names and avatars are user-controlled public content. Implement filtering, reporting, blocking, and a response process, or omit public profiles from the release until appropriately handled. A support email alone does not implement these controls.
4. **Purchases:** finish and test the Pro benefits advertised by the paywall. Verify purchase, cancellation, restoration and expiry on device, with clear price, period, renewal terms, and actual ongoing value.
5. **Account eligibility:** enforce the current 18+ account/product rules in the app, or review the safeguards and update the terms if a younger audience is chosen. Complete Apple's age-rating questionnaire accurately and align availability with the intended audience; neutral website wording and terms do not substitute for that configuration.

Items 2–5 are informed by the [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (1.2, 1.5, 2.1, 2.3, 3.1.2 and 5.1.1). These observations are specific implementation gaps, not an exhaustive review audit.

Email Universal Link sign-in on the installed iPhone was confirmed by the operator on 10 October 2026; `docs/auth-setup.md` records the verification. Check SES production sending access and Google OAuth release availability, real-device account/avatar/result sync, and the archive's aggregate privacy report and required-reason API declarations. No app-owned `.xcprivacy` file was observed in source; that alone does not establish whether bundled SDK manifests or the submitted archive are sufficient. Revise the camera purpose string to say videos are analysed locally and may be exported or shared at the user's direction; “never leaves it” is too broad for those actions.

## App Store privacy answers: working inventory

This app should not be declared **Data Not Collected** while cloud accounts are enabled. Review all production provider logs and SDK behaviour alongside the source. The table distinguishes actual data from tentative questionnaire classifications.

| Data sent off device | Candidate category | Linked / purpose |
| --- | --- | --- |
| Email and names from sign-in or chosen profile | Email Address; Name | Linked to account; app functionality |
| Account UUID | User ID | Linked; app functionality |
| Uploaded profile avatar | Photos or Videos | Linked; app functionality (even though training videos stay local) |
| Touch counts and session duration | Fitness, subject to Apple's current definitions | Linked; training functionality |
| Session source, time, app/counter version, result identifiers/status | Confirm appropriate Usage Data or Other Data category | Linked; history/leaderboard functionality |
| Optional selected country | Assess Coarse Location if it represents user location, otherwise Other Data as appropriate | Linked; profile/leaderboard functionality; no GPS collection |
| Authentication/security logs, IP addresses, and any retained purchase records | Inspect production collection and actual purpose before assigning categories | Provider retention and identity linkage need verification |
| Support messages/attachments | Customer Support or other relevant category, if within reporting scope | Review actual support flow and any optional-disclosure exception |

On-device video/body analysis and StoreKit entitlement checks are distinct from uploaded profile photos and session records. Apple-only payment processing is distinct from developer-retained transaction data. No advertising tracking was observed. These are findings from source, not final App Store Connect answers. [Apple privacy definitions](https://developer.apple.com/app-store/app-privacy-details/)

## Finish the policy operational details

Confirm the following and write plain-language statements into the matching environment fields or policy source:

- `NEXT_PUBLIC_PROCESSING_DETAILS`: optional override of the verified provider/region defaults in `lib/site.ts`. Confirm applicable processor agreements and international-transfer safeguards for the actual setup, including the forwarded Gmail mailbox. Review [Supabase’s DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [Vercel’s DPA](https://vercel.com/legal/dpa) and [Google’s transfer-framework information](https://policies.google.com/privacy/frameworks); public provider documents alone do not prove every required arrangement for this operator is in place.
- `NEXT_PUBLIC_RETENTION_DETAILS`: log/support retention periods or meaningful criteria; account-deletion deadline; backup expiry; legal exceptions with data, reason and duration. Ensure the backend and support process can meet the published commitments.
- `NEXT_PUBLIC_DELETION_INSTRUCTIONS`: optional override of the implemented deletion instructions in source. The remaining live deletion/revocation test is an app submission check, not a missing website setting.
- `NEXT_PUBLIC_CONTACT_ADDRESS`: a suitable public postal address, currently supplied by the operator. Keep the address and mailbox current; confirm any replacement mailbox before setting `NEXT_PUBLIC_SUPPORT_EMAIL_CONFIRMED=true`.
- Review contract, consent and legitimate-interest bases against actual operation, including public-profile consent and its withdrawal, security balancing, and minimisation. Review [GDPR Articles 6, 12–14 and 15–22](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679).

Use `NEXT_PUBLIC_PRIVACY_APPROVED=true` only after those details and the app behaviour have been checked. The flag removes the remaining privacy review notice when required settings are present; terms and imprint publication now depend on confirmed operator details separately. it is not a legal certification. Consider qualified German legal review of the final public address, consumer terms and privacy arrangements.

## URLs and review information

After deployment, use the actual public origin:

| App Store Connect field | Path |
| --- | --- |
| Privacy Policy URL | `/privacy/` |
| Support URL | `/support/` |
| Marketing URL | `/` |
| Optional Privacy Choices URL | `/privacy/#rights` |

Keep `/terms/` and `/imprint/` accessible through the website and relevant app links. A localhost link or GitHub source-file URL is not the hosted policy. Privacy-choice text is not a substitute for working account deletion.

Before submitting, verify pages on the live domain without login, remove draft notices only once resolved, match metadata to the actual app, and provide App Review with working access and accurate instructions for account deletion, optional leaderboard sharing, and subscription restoration. Do not give Apple fictional credentials or claim these flows work before testing them.
