# Contributing to IfSoul

Core owns experimental protocol/runtime/memory/permissions/provider primitives.
SDK and self-hostable App are independent public repositories; Website and Cloud
are private compositions. Start with [architecture](docs/architecture.md),
[repository ownership](docs/architecture.md), and the
active [current specification](specs/current/README.md). Run local checks described in
[development](docs/development.md). No public checkout requires private access.

## Changes and decisions

Keep changes focused and distinguish implemented behavior from proposals. Public
documentation is English. Check the [roadmap](docs/roadmap.md) before adding a
component; implementation requires an agreed scope and owner.

Current contracts use only IfSoul 0.4.0. Remove obsolete format support rather
than adding implicit migration/downgrade paths. Meaningful current
semantic/security tests remain required.

Discuss contract changes with the maintainer. Update architecture, normative
schemas, specifications, examples, tests and API reference together. Keep
implemented behavior distinct from proposals.

## Preserve host authority

The game/mod owns all NPC life logic, state machines, locomotion, combat and
pathfinding. IfSoul and first-party bridges provide context, high-level plans,
dialogue and reported outcomes; they do not implement gameplay controllers or
game skill executors. The host validates proposals and executes through its own
systems. Never infer permissions from a character's text or model output.

Planning frequency and conversation mode are separate policies. Host-requested
speech and live chat need distinct boundaries; keeping a model online grants no
low-level control. Read [bridge authoring](docs/bridge-authoring.md) and
[execution modes](docs/execution-modes.md) before proposing an integration.

## Web interface contributions

Read the [UI/UX approach](docs/ui-ux.md) before changing web panels. It owns
component selection, Cuelark/shadcn integration, the shared Notion theme, branding,
interaction states, accessibility and browser review requirements.

## Validate locally

Use the tool versions in [development](docs/development.md). From `core`:

```sh
pnpm install --frozen-lockfile
pnpm check
```

Report checks actually run, their results and limitations. Schema checks prove
structure, not consent, truthful provenance, host behavior or archive round-trip
safety. Use current-format and explicit rejected-version tests with original synthetic
data and test the boundary being changed.

The [execution policy](docs/deployment.md) runs checks locally. Checks/builds are local and Workers deployment is manual. No scheduled production
monitor is configured. GitHub Actions,
schedules, publishing, hosting-provider builds, remote creation, settings and
pushes require separate authorization.

## Data, rights and reporting

Never commit secrets, private conversations, personal memories, real character
instances or logs containing them. Use newly authored synthetic fixtures rather
than redacted production records. Do not copy another project's implementation,
third-party game characters or assets into this bootstrap.

Provide only material you have the right to contribute under the
[licensing policy](docs/licensing.md): Apache-2.0 for code, tooling, schemas and
machine-readable contract fixtures; CC-BY-4.0 for explanatory prose; CC0-1.0 for
original template JSON in `examples/characters/`. Template provenance identifies
authors, license and origin; these claims still need review.

Follow [SECURITY.md](SECURITY.md) before disclosing sensitive findings. Use the verified private vulnerability-reporting channel linked there; do not
report exploitable details through public issues.

## Review and versioning

Use [versioning](docs/versioning.md) to distinguish source snapshots, experimental
APIs and current contracts. Apply the documented checks to every contribution.
Maintainers inspect changes to guardrails and contract baselines explicitly; a
passing check changed in the same patch is not independent approval.
