# IfSoul App and local laboratory

React + TypeScript + shadcn application surfaces share the Notion theme, brand and
component foundation. `/app` is the common chat, characters, settings and demo
workspace; its accepted shell uses shadcn sidebar-07. Local frontend integration is verified; a real owner Clerk sign-in is also verified against local Workers. `/lab` is local-only synthetic
planning/evidence debugging, separate from neutral main-App conversation.

Cloud mode verifies Clerk sign-in server-side and isolates each user's SQLite
workspace and encrypted BYOK store in a separate Durable Object. Local loopback
mode requires neither Clerk nor an owner-password prompt. Changing runtime
location does not migrate profiles, history or credentials.

Character features remain: manual authoring, model-assisted generation with
review, original starter templates, external-agent prompts, profile-only JSON
import/export, and independent profile/connected-memory selection. Authored
biographies are fictional data, never proof of lived experience or authority.
Full memory archive transfer, editing/deletion and packaged desktop releases
remain deferred. See [character authoring](../../docs/web-laboratory.md#own-characters).

Run `pnpm build:web` then `pnpm lab:web` and open
`http://127.0.0.1:8788/app`. Follow the [web guide](../../docs/web-laboratory.md),
[server boundary](../server/README.md) and [UI/UX rules](../../docs/ui-ux.md).
No production deployment or completed live identity-provider QA is claimed here.
