# IfSoul application server

The local Node server and Cloudflare Worker compose the runtime-host character
workspace, memory and bounded provider clients. Local loopback mode has no Clerk
or owner-password login prompt; Host/Origin/fetch-metadata guards restrict browser
access. Cloud mode verifies Clerk session tokens and routes each authenticated
subject to its own Durable Object SQLite store. Browser-supplied identity fields
cannot choose that store. `/lab` debug behavior is local-only; `/app` conversation
uses a neutral chat context rather than the synthetic garden briefing.

Cloud HTTP requests redirect to HTTPS with status 308 before routing assets or
API handlers. HTTPS responses include one year of HSTS for the current hostname
only; loopback HTTP remains available for local Worker testing.

Local providers include installed Ollama, OpenAI BYOK and labeled scenario mode.
Workers supports Workers AI, per-user OpenAI BYOK and scenario mode. BYOK keys are
write-only through the API and encrypted separately from character history.
Encryption does not protect against a compromised running server.

Owner-paid Workers AI in App and demo shares the fixed legacy `owner-laboratory` Durable
Object reservation gate. It persists per-user and global UTC-day counters before
inference, retains failed reservations, and fails closed on unavailable/corrupt
storage. Provider calls are bounded to 22,000 request bytes and 384 output tokens.
Demo request IDs are idempotent within one UTC day; rollover permits a new paid
call with an old ID. Game/reset operations cannot erase quotas. Demo invitations,
admin issuing and login cookies are removed. Public scenario play makes no calls.

Use `pnpm build:web` and `pnpm lab:web` locally. Cloud builds/deployments remain
manual under [deployment policy](../../docs/deployment.md). This README describes
source implementation, not production release or completed real Clerk browser QA.
See [web guide](../../docs/web-laboratory.md) and
[security boundary](../../docs/public-private-boundary.md).

For local demo model mode, run Ollama with `llama3.2:latest` installed (or select an
installed text model through `IFSOUL_DEMO_MODEL`). The status endpoint checks the
configured model through Ollama discovery without running inference or charging
quota. An offline provider leaves free scenario play available.
