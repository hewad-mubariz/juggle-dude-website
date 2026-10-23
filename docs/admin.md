# Private touch-review desk

`https://juggledude.com/admin/` is a Next.js server-backed admin, using TanStack React Query for the queue, detail loading and finalisation. Marketing pages remain prerendered. A static-only host cannot serve the admin API.

## Deployment

1. Apply `supabase/migrations/202610230002_admin_review_panel.sql` to the existing Juggle Dude project. It depends on the existing `leaderboard_attempts`, profiles, sessions, touch-review JSON, and `review_leaderboard_attempt` RPC. The optional newer session streak columns are handled without requiring their migration.
2. Set the **server-only** variables in `.env.example`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_RATE_SECRET`, and `ADMIN_ORIGIN`. Use Sensitive production environment values in Vercel. Do not expose the service key, password hash or rate secret through `NEXT_PUBLIC_*` variables.
3. Generate a password hash using `npm run admin:hash`; it reads a hidden password and outputs only the salted scrypt hash. Set `ADMIN_EMAIL` to the single authorised administrator. The initial account is configured outside Git. No Supabase Auth signup or client role flag grants admin access.
4. Set `ADMIN_ORIGIN=https://juggledude.com`. Preview deployments fail closed for mutation requests unless deliberately configured with their own exact origin. Local development needs the exact local origin, including port.
5. Run `npm run typecheck`, `npm run test:admin`, `npm run test:email-link`, and `npm run build`. `npm run preview -- 4174` starts the production Next.js server locally; use the same origin in local environment settings.

The additive SQL is the deployment source for this website. Its version should also be recorded in the app team's database-migration history before their next schema deployment. The admin implementation does not edit the sibling iOS repository. The current app also requires the streak-session migration described below for its result sync before review uploads can start.

## Access controls

- A salted scrypt hash is checked on the server. The password and service key never enter the React bundle.
- Successful login creates a random 256-bit session. Only its SHA-256 is stored in the private database schema. Cookies are HttpOnly, Secure on production, SameSite Strict, and host-only, with a four-hour absolute lifetime. Logout revokes the database session. Login cleans up expired session records.
- Login attempts are limited transactionally in Postgres: five per originating IP per 15 minutes, with a global 60-attempt limit. Identifiers are HMAC-hashed with the server rate secret. Vercel's trusted `x-vercel-forwarded-for` header supplies the production IP; non-Vercel local operation shares a conservative local bucket. If deploying behind a different proxy, review that trust boundary before use.
- Every private API route checks the database session. Every mutation also requires an exact Origin and JSON content type. Bodies, IDs, decision sets, timestamps, score ranges and reasons are validated. No CORS permission is granted.
- All new database functions explicitly revoke public/anonymous/authenticated execution. Only the service role can call them. Private tables have RLS and no browser grants.
- API responses and video streams are private/no-store. Videos are streamed through an authenticated endpoint; the browser receives neither service credentials nor shareable storage links. Framing is blocked and admin routes are excluded from search indexing.
- Rotate the password by updating its hash and deleting existing private admin sessions through the trusted operator workflow. A password change alone does not revoke already-issued sessions. The panel has no public signup or password-reset flow.

## Review workflow

1. Open Waiting, choose a request, and select **Verify & load clips**. The server streams the submitted bytes through SHA-256 and checks their length against the immutable submission. No local copies are saved. Verification expires after one hour and must be repeated if needed; a large/slow video can time out and fails closed.
2. Select a moment and play it through. Timestamps refer to the original recording; merged uploaded clip windows are mapped onto the compact video's timeline. Older whole-recording uploads are handled by their media duration. Verify the visible footage, not only the device's label.
3. **Confirm touch** means the player's disputed contact was valid; **Reject request** keeps that detection uncorrected. These requests are touches the app left out or used to split a streak, not proof that every flagged event was an error. Continuity gaps are context, not additional touches. Confirm all becomes available after all requested clips have been played.
4. Review the batch, write a player-visible explanation, verify the final streak and recording boundaries, and attest that the evidence was watched. Mixed decisions require a manually checked score: the backend does not store all original touch timestamps, so adding one point per accepted moment would produce incorrect streaks when a hand/hold/ground boundary is removed. If the available clips cannot establish a partial streak, do not invent it.
5. **Finish & sync review** saves all moment decisions and calls the existing review RPC in the same database transaction. A row lock prevents stale reviews; retrying the same request ID and payload is idempotent. Reusing its ID with changed data is refused. Failed validation rolls back the audit and score together.

The existing `leaderboard_attempts` row is the app's source for review status, reason and reviewed score. The app's existing account review refresh reads it; this is server persistence, not a new push notification or forced refresh of an open phone. The separate device session total is immutable and is not overwritten. The personal-best metric and automatic streak-ranking rollout are separate app features; the admin does not silently redefine them.

Confirmed and Rejected tabs show finalised requests and their saved decisions. This first version does not reopen appeals or alter completed reviews. Deleted/withdrawn evidence cannot be approved. Existing storage-retention and account-deletion functions remain responsible for media cleanup; batch records cascade with their attempt/account. No real player request is approved or rejected during automated testing.

## Verification

`test:admin` runs the migration in isolated PGlite PostgreSQL, including anonymous access denial, rate limits, session revocation, byte-verification requirements, exact decision sets, partial scores, atomic finalisation, idempotent retries and stale-review rejection. It also checks clip mapping and strict input/password/origin handling. Live route checks should additionally verify cookies, unauthenticated requests, cross-origin rejection and successful operator login. A real submitted clip is needed to complete an end-to-end media-format/device-sync check.

### Isolated HTTP and browser fixture

The optional `scripts/tests/mock-supabase.mjs` preload runs a fresh in-memory PostgreSQL fixture with synthetic data. It is never imported by application code or deployed. It reads the existing review RPC source from the sibling `kicklab` checkout and the website migration, and intercepts only the fixture project's upstream requests inside that test process. Generate a small plain-colour MP4 outside Git at `/tmp/juggledude-admin-fixture.mp4`, then start `NODE_OPTIONS=--import=./scripts/tests/mock-supabase.mjs node scripts/preview.mjs 4175`. `node scripts/tests/admin-http.mjs` verifies the actual Next.js routes against that fixture. The fixture login is test data, not the production administrator. Restart it for each run; successful integration tests consume its pending request.

The public privacy copy now describes optional private touch-check uploads, review decisions/retention, essential admin cookies and the server-backed hosting. Existing public marketing and age/eligibility decisions are preserved.

## Live upload diagnosis — 23 October 2026

The operator reported three requested touch checks still showing Sending. Production had zero `juggling_sessions`, zero `leaderboard_attempts`, and zero objects in `leaderboard-originals`. The current app sends results through `submit_juggling_session_with_streak` and waits for the session to become synced before creating an attempt or uploading review clips. That RPC and its three streak columns were missing in production.

The existing full `scripts/test-account-backend.sh` suite in the sibling app passed against an isolated temporary PostgreSQL database, including the streak migration and its permissions, immutability, correction, period and visibility checks. The matching `202610230001_streak_leaderboard.sql` was copied here and applied transactionally to production. Its SHA-256 is `08a721846985faa52233dbfb57fa1ca4c711abe0abf9ed5dbce75894eadc33ac`. The app working tree and its pre-existing edits were left intact. This enables the current app's session sync and matching streak ranking; profile visibility still follows the existing opt-in setting. No review decision was made for a real user.

The phone keeps its pending result/review outboxes and retries session sync while running, with backoff up to 180 seconds. A phone-side refresh/retry can resume sooner. The presence of the missing server function does not by itself prove that a specific device upload completed; verify the real attempt, object, clip count and browser playback after it arrives.
