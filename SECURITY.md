# Security reporting

IfSoul is experimental source software with a runtime, real provider clients and
an authenticated single-owner laboratory server. It has no supported stable
production release or multi-tenant managed service. The active
[v0.2 design](specs/v0.2/README.md), retained v0.1 regressions and independently
retained v0.1 ModelProvider contract are not a security assurance or release
maintenance commitment.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/openifsoul/core/security/advisories/new)
for this repository. Private vulnerability reporting was enabled and verified on
2026-11-05. Reports are handled by the repository maintainers and organization
owners; the current maintainer is [h3lpkey](https://github.com/h3lpkey).

Sign in to GitHub and use **Security → Advisories → Report a vulnerability**.
Do not open a public issue or discussion containing exploitable details,
credentials, private archives or personal data. Keep technical discussion in the
private report until coordinated disclosure is agreed with the maintainers.

Include the affected component and commit/version, expected and observed
behavior, potential impact and a minimal original synthetic reproduction.
Exclude real conversations, player memories, credentials and third-party game
assets. If the form is unavailable, request a private contact route from the
maintainer without disclosing vulnerability details publicly.

Maintainers triage reports and coordinate fixes and disclosure in the private
advisory. There is currently no guaranteed response time, bounty program or
supported stable production release. Enabling the channel is not a security audit.

## Design and scope

See the [threat model](docs/security.md), [runtime profiles](docs/runtime-profiles.md)
and [execution modes](docs/execution-modes.md). Future implementations must protect
context and archives, enforce disclosure/consent and resource limits, isolate
credentials, authenticate local services and propagate deletion.

The host game/mod retains all NPC controllers, life state machines, movement,
combat and pathfinding. A high-level plan, dialogue response or live model
connection grants no control authority. Bridges must not execute imported text
or model proposals as game skills. Selected context, host outcomes and live
conversation are still untrusted data and can contain private information.

The v0.1 provider contract remains a separate model-input/output boundary; tool
calling support is not permission to control a game. Local/BYOK/managed profiles
need explicit disclosure and credential boundaries. Current checks cover contracts and selected runtime semantics, not a complete
security audit. The CLI trusts local composition and its database; it is not
a sandbox for hostile code or a network-authenticated service. Define release
support and verify additional controls before production use.
