# Execution and deployment policy

Accepted by the owner on **2026-11-05**. The same policy is recorded in the
repository [AGENTS.md](../AGENTS.md); the local parent workspace also records it.

| Operation                | Execution location    | Command / trigger                                                           |
| ------------------------ | --------------------- | --------------------------------------------------------------------------- |
| Install tooling          | Local machine         | `pnpm install --frozen-lockfile`                                            |
| Validate local prototype | Local machine         | `pnpm check` (format, types, contracts, runtime/lab tests, docs/boundaries) |
| Run local lab            | Local machine         | `pnpm lab demo`, `pnpm lab inspect`, `pnpm lab chat --message "..."`        |
| Format files             | Local machine         | `pnpm format`                                                               |
| Web / Worker build       | Local machine         | `pnpm build:web`, `pnpm build:cloud`                                        |
| Deploy                   | Local machine, manual | `pnpm deploy:cloud` after checks                                            |
| Production monitoring    | No scheduled monitor  | Manual inspection of the owner laboratory                                   |
| Publish packages         | Not present           | No registry credentials or automatic publication                            |

The repository's existence on GitHub does not authorize remote execution.
Do not add GitHub Actions, scheduled jobs, duplicate hosting-provider builds,
automatic publishing, or automatic deployment without an explicit owner decision.
There are no platform exceptions in this bootstrap.

On 2026-11-05 the owner authorized the runtime/SQLite and synthetic host/CLI
laboratory implementation. These local development commands replace the earlier
documentation-only check scope. No API credentials or live model calls are needed
for the default lab and tests. The source-run CLI is not a packaged production
release. Runtime data defaults to ignored `.local/`; close owned SQLite handles
and remove only task-owned temporary test directories.

The authorized web/server commands, credentials boundary and rollback limits are
recorded below. Evaluate monitoring separately from builds.

Remote repository creation, settings changes and initial push are a separate
approval stage. Do not change the visibility of existing repositories automatically.

## Authorized web/server slice (2026-11-05)

The owner explicitly approved Cloudflare Workers hosting, local checks/builds,
and manual Wrangler deployment. No GitHub Actions or hosting-provider build is
introduced. `pnpm build:web` builds React/TypeScript/shadcn assets locally;
`pnpm build:cloud` builds assets and dry-runs Wrangler; `pnpm deploy:cloud`
builds assets and deploys manually. Run `pnpm check` first. `pnpm lab:web`
starts the loopback-only local server on 127.0.0.1:8788; `pnpm dev:cloud` runs
local Workers simulation. Workers AI calls still require the actual AI service.

The public `wrangler.jsonc` is a reproducible self-hosting template, containing no
account ID, secrets or custom domain. IfSoul App cloud mode requires Clerk
configuration and a separate encryption secret. Never put secrets in shell
arguments, source, browser bundles or documentation; use ignored local secrets
for development and Worker secret bindings for a separately authorized deployment.

Cloud identity selects a distinct SQLite Durable Object for each verified Clerk
user. The old owner object is preserved, not assigned to a new user. Demo budget
coordination is shared across users rather than duplicated per user store. Cloud
and local stores are separate: changing location does not migrate or merge state.

Local mode binds only to `127.0.0.1`, validates Host and Origin, and requires no
Clerk account or password entry. Its ignored `.local/server/owner.json` retains
private encryption material (0600). Do not expose this no-login mode to a network
interface or place it behind an unprotected public proxy.

The owner approved creating a test Clerk instance through their browser after
implementation. Enable only Google and email sign-in, disable other social and
enterprise providers, and verify both flows against the configured app origin.
A local signed-token test does not replace this live verification. No test Clerk
instance, remote deployment or public registration is implied by a successful
local build.

### Cloud configuration (local verification first)

| Binding                 | Purpose                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| `CLERK_PUBLISHABLE_KEY` | Public Clerk instance key, returned by `/api/config`                            |
| `CLERK_ISSUER`          | Exact HTTPS issuer for that instance                                            |
| `CLERK_JWT_KEY`         | PEM public verification key for networkless session verification                |
| `APP_ORIGIN`            | Exact authorized application origin; HTTPS except explicit loopback development |
| `ENCRYPTION_KEY`        | Private deployment secret for server-side BYOK encryption                       |

Configure Clerk's allowed origins/redirects for the same origin. Keep email
verification enabled; enable only email and Google sign-in in Clerk. No Clerk
secret key is sent to browsers. The JWT verification key is public cryptographic
material, but belongs in server configuration rather than application bundles.
Changing verification keys requires coordinated configuration rotation. Offline
verification accepts a signed session until its short JWT expiry; it does not
perform an online session-revocation lookup on every request.

The existing `Laboratory` class/binding and v1 migration remain stable. New user
stores have server-derived names. The old owner object is used only as the shared
budget/demo coordinator; its private application API is not routed to users.
Existing account data is not automatically migrated into a Clerk account.

An initial Durable Object migration creates the server store. No destructive
migration is part of this slice. Worker rollback can restore compatible code;
it does not roll back persisted character state or inference costs. Keep data
schema changes backward compatible until a tested migration/backup path exists.

## Browser playground

The same locally built assets serve `/demo`; `/` links to the three games.
Scenario play needs no login and performs no LLM calls. Cloud inference requires
a verified Clerk session; invitations are removed. Local inference uses Ollama
(`IFSOUL_DEMO_MODEL`, default `llama3.2:latest`) without Clerk. Cloud demo inference
uses an allowlisted Workers AI model with bounded input/output and persistent
per-user/global reservations. See [quotas and privacy](browser-demo.md).

Laboratory is available only in local mode. Cloud must reject debug operations
server-side, not merely hide its navigation. Ordinary App chat, character profiles,
selected memory and BYOK settings remain available to the authenticated user.

The owner authorized final verified source publication and manual production
release on 2026-11-06. This supersedes the initial local-only restriction.
`build:cloud` remains a local build and Wrangler dry-run; no command implies an
automatic deployment. Keep npm publication, remote CI and schedules disabled.

## Owner domain

The owner selected `https://ifsoul.h3lpkey.com` as the initial production origin
on 2026-11-05. The authorized manual production publication attached this Custom Domain on
2026-11-06. Keep the public self-hosting template generic and local Clerk testing
on loopback; the ignored reviewed owner configuration persists the production
route and variables. Source publication does not imply npm publication.

## Owner production release gate

The owner origin is `https://ifsoul.h3lpkey.com`; the existing Worker identity is
`ifsoul-laboratory`. The owner authorized this manual release after final local
checks and the public-source secret audit. Deployment evidence is recorded only
after the release is observed; a pre-Clerk predecessor is not automatically a
safe rollback target.

A local proposal is saved at
`.local/deploy/wrangler.production.proposal.jsonc`, with its local README and
`check-production.mjs` preflight. These files are ignored owner artifacts, not
part of the public self-hosting template. The proposal preserves the Worker
name, `LAB` binding, `Laboratory` class, existing v1 migration and AI binding.
It records the Custom Domain, exact production `APP_ORIGIN`, disabled previews
and `workers.dev`, and `keep_vars=true`. Its production publishable key and expected issuer are now recorded locally;
production readiness must still be checked against the actual Clerk/Google and
HTTPS state before publication. The preflight rejects the proposal filename regardless of key
shape. A Wrangler dry-run compiled this proposal with
local built assets; that is compilation evidence, not production readiness.

The preflight rejects the proposal and any missing reviewed configuration. After
the coordinator obtains the external inputs, create the reviewed
`.local/deploy/wrangler.production.jsonc` and run:

```sh
node .local/deploy/check-production.mjs .local/deploy/wrangler.production.jsonc
pnpm install --frozen-lockfile
pnpm check
pnpm build:web
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false pnpm exec wrangler deploy \
  --config .local/deploy/wrangler.production.jsonc \
  --dry-run --outdir .local/deploy/dry-run
```

Stop on any failed command. The preflight checks non-secret configuration,
Worker/storage identity and matching production publishable-key/issuer host. It
does not inspect secret contents or verify live login. Clerk production keys do
not establish a working localhost sign-in flow; verify production on the real
production domain after its separately authorized publication.

### External inputs still required

- The production Clerk instance now exists. Its public publishable key, expected
  issuer `https://clerk.ifsoul.h3lpkey.com` and RSA public verification key are
  recorded in the ignored owner proposal/key-upload artifact. The PEM parses
  locally; this is not live signature/login evidence. A development `pk_test_`
  instance must not replace this production configuration.
- Clerk production-domain/DNS setup, verified email delivery and only Google and
  email sign-in enabled. Production Google OAuth credentials/consent and callback
  configuration belong in Clerk/Google, not in Worker source or browser code.
  The reviewed Google callback is
  `https://clerk.ifsoul.h3lpkey.com/v1/oauth_callback`. Clerk DNS and certificates and the saved Google connection were verified before
  release. Google Audience publication follows the reachable public policy pages;
  successful real login still requires post-deployment verification.
- Authorized Cloudflare domain/DNS/certificate work as required. On 2026-11-05,
  normal `curl --head https://ifsoul.h3lpkey.com` verification failed with exit 60
  because the certificate had expired. Do not substitute `--insecure` for a
  successful HTTPS check or infer that a Worker dry-run fixes a certificate.
- The owner has now explicitly authorized the manual publication and resulting
  production smoke. That scope adds no npm publication, remote build or schedule.

Keep the existing `ENCRYPTION_KEY` untouched: do not read, copy, rotate or replace
it as part of this release. Existing encrypted BYOK data depends on it. The
coordinator can prepare an ignored owner-only (0600)
`.local/deploy/clerk.production.secrets.json` containing **only** `CLERK_JWT_KEY`.
Do not dump a process environment into that file. Never print or commit its
contents. The application does not need a Clerk secret API key for its current
networkless token verification.

### Manual publication after the release gate

Only after the reviewed configuration preflight, full local validation, external
setup and explicit publication authorization succeed may the coordinator run a
manual Wrangler deployment using that exact configuration. The command must be
guarded by the preflight and include the additive Clerk JWT-key upload file:

```sh
# Run only after the authorized release gate and configuration review pass.
node .local/deploy/check-production.mjs .local/deploy/wrangler.production.jsonc --require-secrets && \
  pnpm exec wrangler deploy \
    --config .local/deploy/wrangler.production.jsonc \
    --keep-vars --secrets-file .local/deploy/clerk.production.secrets.json
```

Wrangler preserves existing secrets when omitted from this additive upload;
never put `ENCRYPTION_KEY` in the upload file. `keep_vars` preserves unrelated
remote variables while the explicit reviewed values remain authoritative. It
does not preserve an omitted Custom Domain. Keep both routes and variables in
the reviewed configuration for every subsequent owner deployment. Avoid relying
on dashboard-only edits or one-off `--var`/`--domain` flags.

Before using generic `pnpm deploy:cloud` for this owner installation, the
coordinator must activate and verify Wrangler's existing ignored
`.wrangler/deploy/config.json` redirect to the reviewed owner configuration, or
retain the explicit `--config` argument on every manual deployment. The relative
redirect value is `../../.local/deploy/wrangler.production.jsonc`. Do not activate
it against the incomplete proposal. A fresh dry-run must confirm the effective
configuration and domain. The public template remains generic; a future checkout
without the owner redirect must not be used blindly against this production
Worker. See [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
and [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

### Production smoke and recovery

After a separately authorized publication, verify ordinary TLS without bypasses,
then `/api/config` reports cloud/Clerk, the exact production publishable key and
`laboratory:false`, without secrets. Check unauthenticated protected requests
return 401, debug routes remain forbidden, and landing/scenario play stay public.
Perform real Google and verified-email sign-in on the production domain. Use two
controlled accounts to check isolated character/chat history, guessed foreign
character export rejection and BYOK separation. Check logout clears frontend
access; offline JWT verification still permits a previously issued token until
its short expiry. Confirm the existing shared budget coordinator and quotas
remain effective across game resets and App requests. Any live paid inference
smoke remains bounded and must fall within the separately authorized test scope.

Record the resulting deployed version and smoke evidence only after observing
success. Do not mark the release complete from a build, a DNS record or a login
screen alone. A rollback must preserve per-user authentication/storage and budget
boundaries; do not blindly restore a pre-Clerk predecessor. Code rollback does
not undo persisted data or inference charges. If a verified safe recovery version
is unavailable, stop rollout and coordinate a fail-closed recovery rather than
exposing a legacy owner API.

Clerk setup and production-domain verification follow its
[production deployment guide](https://clerk.com/docs/guides/development/deployment/production)
and [production-instance testing guidance](https://clerk.com/docs/guides/development/testing/test-against-production).

## Initial production publication — 2026-11-06

The reviewed source release was committed and pushed as
[`602aeb5`](https://github.com/openifsoul/core/commit/602aeb58717f05d8b712bfc2140cb13a1c1c63a1).
The initial App deployment produced Worker version
`733d9fb4-8181-4619-b160-be631ae88951` on the existing Worker and attached the
Custom Domain. Trusted HTTPS then served `/`, `/app`, `/privacy` and `/terms`;
`/api/config` reported cloud/Clerk with `laboratory:false`, unauthenticated
character access returned 401 and cloud laboratory access returned 403.
The former expired application certificate no longer blocked those checks.

Clerk DNS/certificates and the Google connection were verified, and Google's
Audience was set to production after the public policy URLs were reachable.
A real Google sign-in completed through the live production App and returned an
authenticated cloud workspace. Email OTP is configured but its delivery was not
exercised in this release smoke; no live paid chat was performed. Existing encryption material and
Durable Object data were preserved. The existing shared budget coordinator was
not replaced. No npm release, GitHub Actions, remote build or schedule was added.

The public privacy and terms pages describe the implemented data/retention limits
and manual deletion/support process. A subsequent copy-only patch removes the
obsolete invitation sentence; final release identifiers are reported after that
patch is deployed. This section records the initial publication, not a claim that
it is the latest compatible Worker version forever.

## HTTPS transport follow-up — 2026-11-06

Worker version `ef79730e-0567-461b-bfa5-49717dbeedfe` adds HTTP-to-HTTPS
308 redirects before asset/API routing and one year of HSTS on HTTPS responses
for the current hostname only. Loopback HTTP remains supported for local tests.
The existing Worker identity, storage bindings and encryption secret were preserved.

Frozen installation, `pnpm check` and `pnpm build:cloud` passed locally before
manual deployment with the reviewed owner configuration. Production curl checks
verified trusted TLS, HTTP redirects preserving the path/query (including POST),
HSTS on protected 401 responses and the public cloud/Clerk configuration. A clean
headless Chrome session reported `secure` with no security issue IDs or HTTP
subresources on the App; that owned browser was closed after verification.
Clean-browser HTTPS was already valid before this patch, so these transport
changes do not establish the cause of a warning retained in an existing browser
profile. No live sign-in or paid inference was repeated for this patch.

## Playground refresh and public discovery — 2026-11-06

The owner authorized the visual/gameplay refresh, public Git commits/pushes and
a manual Worker update after local checks. This also includes public-page
discoverability. The build now prerenders public information and discovery files;
it does not run games or model calls during rendering. Set
`IFSOUL_PUBLIC_ORIGIN` when building for a different self-hosted origin.

Release checks cover the three independent game packages and SDK archives,
staged source and archive secret patterns, local Core/web/Worker checks, and
headless JavaScript-enabled and disabled browsing. Prerender tests distinguish
public game descriptions from the noindex private App shell. Edge bot protection
is checked separately from application authentication. Completion and deployment
identifiers must be recorded after the actual release smoke.

On 2026-11-06, a host-specific Cloudflare Configuration Rule named
`IfSoul public information readers` was observed active. It disables Browser
Integrity Check only for GET/HEAD on the exact `ifsoul.h3lpkey.com` public paths
`/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml` and `/llms.txt`.
A normal Python urllib request to `/` and `/demo` then returned 200 instead of
Cloudflare 1010. Account/API paths and all other hostnames are outside the rule;
managed training-crawler preferences remain unchanged. Do not broaden this to a
zone-wide security bypass. This edge rule is owner configuration, separate from
the public self-hosting template and Worker deployment.
