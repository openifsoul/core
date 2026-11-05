# Web laboratory

Every web panel uses React, TypeScript and shadcn/ui. Components under
`apps/laboratory/src/components/ui` originate from the official shadcn new-york
registry and retain the [MIT license](../LICENSES/shadcn-MIT.txt). Application
styling, orchestration and state handling are original IfSoul code.

## Run and choose a mode

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build:web
pnpm lab:web
```

Open `http://127.0.0.1:8788`. The local server generates its owner password in
ignored `.local/server/owner.json` with restricted file permissions. The console
prints the path, never the password. Open the file locally and enter its password
in the panel. `IFSOUL_DATA_DIR` selects an independent local store; `PORT` changes
the loopback port. The local server rejects other Host headers and binds only
to 127.0.0.1. Shut it down normally to release its SQLite lock.

For hosted execution see [deployment](deployment.md). The same panel and service
run on Workers with SQLite Durable Object storage. The server requires its owner
password before data, credential or inference APIs are accessible.

Runtime location and model are separate selectors:

| Runtime           | Available inference                                                 |
| ----------------- | ------------------------------------------------------------------- |
| Cloudflare server | Workers AI, OpenAI BYOK, explicitly synthetic scenario              |
| Local server      | Installed Ollama models, OpenAI BYOK, explicitly synthetic scenario |

Unsupported combinations are visibly disabled. A cloud runtime cannot reach your
computer's Ollama. Switching location navigates to that server's panel and requires
its own login. Cloud and local stores are separate; no automatic history transfer
or identity merge is claimed. Within one runtime, provider/model switches retain
the same character and permitted history.

## Complete cycle

Request a plan from the selected model. The service supplies current bounded
context; the model produces high-level tasks. Runtime validates them before the
synthetic host accepts/rejects tasks and records actual abstract outcomes. The
host starts each independent simulation run with two uninspected beds and zero
water. Its observations do not describe a real game.

Then send a message. The selected provider receives authorized memory and current
chat input. Inspect memory, trace and optional raw debugging details to distinguish
proposal, acceptance, task result and dialogue delivery. The UI confirms storage
of a reply as local transcript delivery; this is not proof a human read it.
The displayed selected memory IDs are now retained in the laboratory run record.
Hidden reasoning is neither requested nor displayed.

Live model quality varies. A structurally valid empty plan or irrelevant response
is not evidence of good agent behavior. No failed real request silently falls
back to synthetic text. The scenario option is always labeled as such.

## Keys and recovery

OpenAI's key form is write-only. It sends the key only to the current server,
clears it after success, and never puts it in browser storage. The server encrypts
it separately from character memory. Disconnect removes the server's stored
copy; revoke the original credential at OpenAI if revocation is intended. Use a
separate OpenAI project and a restricted Responses API key. Key expiry, provider
billing/quota and permission changes can make requests unavailable.

Only theme and unsent chat draft are kept in browser storage. Login passwords and
provider keys are not. Drafts remain after failed submissions; duplicate clicks
are disabled. A transport timeout retains the request ID for safe retry. A
completed recorded failure allows a new explicit attempt with a fresh ID. An
unfinished server claim needs reconciliation and is not retried automatically.

The current owner lab allows eight login attempts per minute and sixty run
requests per hour, stored server-side. These are request limits, not a guaranteed
currency budget. There is no public registration, multi-tenant service or billing
system. Read [public/private boundaries](public-private-boundary.md) and
[provider behavior](providers.md) before exposing or extending the service.

## Verification

Local suites cover credentials, signed-session expiry, hostile origins, forged
cookies, inaccessible unauthenticated inference, encrypted storage, request
bounds, providers, runtime and persistence. Headless browser verification covers
sign-in, synthetic plan/chat, memory, desktop/mobile layout and failed-send draft
retention. No browser test uses a personal Chrome profile. Live provider runs are
separate from deterministic tests and can incur provider usage.
