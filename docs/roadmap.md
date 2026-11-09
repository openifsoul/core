# Roadmap

IfSoul provides character protocol/runtime primitives, scoped persistent memory,
provider clients, a bounded host SDK and a self-hostable App. Games own mechanics,
action adoption and execution. See [architecture](architecture.md),
[runtime API](runtime-api.md) and [resource budgets](resource-budgets.md).

## Relationship interpretation and revision

Relationship interpretation and revision are model-dependent. Current validation
and persistence checks do not establish reliable semantic reassessment.
Improve source-grounded reassessment across providers and scenarios, including
contrary evidence, perspective, confidence and meaningful explanation changes.

## Memory and identity

- Semantic retrieval and embeddings alongside bounded source-preserving recall.
- Broader archive and distributed ownership/merge interfaces.
- Richer explicit player identity and consent mapping across host compositions.
- Clear inspection and management of evidence, interpretations and their sources.

Memory import creates an untrusted filtered fork with a new identity, not a full
backup or same-identity restore. See the [App memory reference](https://github.com/openifsoul/app/blob/main/docs/memory.md).

## Hosts and providers

- Additional host adapters with typed context, authenticated identity mapping and
  host-owned outcomes and action adoption.
- Provider/context budget configuration and disclosure in each composition.
- Configurable character dialogue presentation and planning cadence.

Hosted inference is bounded by configured per-user and shared quotas. Local
cancellation does not guarantee that provider-side work or charges have stopped.
