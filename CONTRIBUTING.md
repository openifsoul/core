# Contributing to IfSoul

IfSoul has draft contracts and an experimental local runtime, SQLite memory
and CLI/web laboratory with real provider clients and an owner server. Published
SDKs and real game integrations remain future work. Start with the [product](docs/product.md), [architecture](docs/architecture.md),
[boundaries](docs/boundaries.md) and active [v0.2 specification](specs/v0.2/README.md).
Useful contributions now include contract review, clear documentation and focused
positive or negative fixtures.

## Changes and decisions

Keep changes focused and distinguish implemented behavior from proposals. Public
documentation is English. Check the [roadmap](docs/roadmap.md) before adding a
component; implementation requires an agreed scope and owner.

The owner approved the v0.2 design revision. Preserve v0.1 schema and example
bytes as historical regression evidence; add v0.2 separately. The
[ModelProvider contract](specs/model-provider/README.md) remains independently at
`draft-0.1.0`. Passing an old action fixture does not recommend an action-control
architecture for new bridges.

Discuss further contract changes with the maintainer. Record architectural or
compatibility decisions in an [ADR](docs/decisions/README.md), then update the
normative schema, specification, examples, tests and
[compatibility notes](docs/compatibility.md) together. A proposed ADR is not an
accepted decision. Wire versions, archive versions, template revisions and future
package versions are separate dimensions. Incompatible changes need explicit
versions; draft status does not authorize silent data loss. Do not maintain a
second normative type definition or remove unsupported fields to pass validation.
A schema revision alone does not implement migration.

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
safety. Keep v0.1 regressions distinct from v0.2 coverage; use original synthetic
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
APIs and frozen contracts. Project-local [skills](AGENTS.md#project-skills) support
implementation and review; the same checks apply to human and AI contributions.
Maintainers inspect changes to guardrails and contract baselines explicitly; a
passing check changed in the same patch is not independent approval.
