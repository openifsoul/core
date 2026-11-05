# ADR 0009: One public runtime, multiple execution modes

Status: Accepted, 2026-11-05. Amends the earlier memory-only cloud import boundary
in [ADR 0001](0001-workspace.md). It does not authorize cloud deployment.

## Decision

Describe a public headless runtime host that assembles memory, controller,
permissions, model providers and environment connections. Character Manager is a
client/composition option, not the only place an agent can live. Managed services
may host the same public runtime and use its public ports. A self-hostable runtime
must not depend on private account, billing or operations code.

Support three product configurations: local runtime/memory with a local model;
local runtime/memory with a user's remote model API credentials; and managed
runtime/memory/inference. BYOK describes credential/billing choice, not execution
location. A local game still needs a local host connector in managed mode unless
its game server provides the connector. Host game behavior remains local to that
host; the cloud does not implement NPC movement or combat.

A ModelProvider supplies inference. An AgentController is a separate planned
strategy boundary for a full external agent, receiving scoped context and returning
bounded plans/dialogue proposals under the same host policy. Neither receives
unrestricted game or memory access. No extra repository or package is needed now.

## Consequences

The download-and-configure promise needs a future installable application, setup
flow and connection diagnostics. Documentation-only bootstrap does not deliver it.
Cloud hosting, synchronization, billing and packaging remain implementation work.
Local checks and future local builds remain the approved policy; no remote
automation, accounts or paid services are configured by this ADR.
See [execution modes](../execution-modes.md).
