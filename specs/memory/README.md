# Memory contracts

Historical v0.1 contract. See [v0.2](../v0.2/README.md) for the current design;
the v0.1 JSON examples remain unchanged for regression checks.

A Memory Event records what a source supplied to an observer, with provenance.
It is not a universally true fact. A Derived Memory is replaceable interpretation
or indexing data built from raw events; it never replaces them automatically.
Neither format grants permission or acts as a trusted instruction.

| Document       | Required fields beyond `schemaVersion`, `kind`                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Memory Event   | `eventId`, `characterId`, `worldId`, `sessionId`, `source`, `observerId`, `recordedAt`, `worldTime`, `scope`, `payload`, `provenance` |
| Derived Memory | `memoryId`, `characterId`, `createdAt`, `scope`, `sourceEventIds`, `derivation`, `payload`                                            |

A source has `sourceId`, `kind` (`world-adapter`, `runtime`, `user`, or `import`),
and a nonnegative `sequence`. Sequence is ordered only within that source's
world/session stream; duplicates or regressions require explicit reconciliation.
`recordedAt` is wall-clock recording time; `worldTime` is the separately named
world timeline and tick. Neither defines global order across sources. Importers
MUST preserve original source/provenance rather than manufacture fresh historical
truth or treat equal ticks from different timelines as comparable.

An event payload has an opaque `type` and open object `data`; interpreting that
data requires a known payload contract. `provenance.eventIds` and
`provenance.worldEventIds` are unique ID arrays, empty when no source references
exist. A future consumer checks identity, accessible references, source-local
sequence ordering, and consistency with the character/world mapping. Optional
`confidence` lies in `[0,1]`; it is a source-supplied score, not a calibrated
probability, consensus, or permission.

## Access and export scope

Every event, derived record, world event, and observation item has a `scope`:
`audience`, `subjectIds`, and `export`.

- `private` requires exactly one subject ID: the intended subject.
- `participants` requires at least one explicit subject ID and exposes data only
  to those subjects under trusted policy.
- `public` requires an empty subject list. It describes world-audience visibility,
  not permission to publish player data on the Internet.

These list/cardinality relationships are semantic checks in this baseline.
Subject IDs use the record's world/session context; a derived record resolves
subjects through its source events. If source contexts differ, trusted identity
mapping and a scope no broader than every source's access are required; without
that mapping the derivation MUST be rejected. A string copied from an imported
record is never sufficient proof of identity.

`export` is `allowed`, `consent-required`, or `forbidden`. Access and export are
separate decisions: visibility does not imply export consent. `allowed` remains
subject to actual authorization; `consent-required` needs verifiable consent;
`forbidden` is excluded. Filtering MUST report losses without exposing withheld
payloads. Scope enforcement and consent verification are not schema checks.

## Derived records

`sourceEventIds` is a nonempty unique array. `derivation` requires `algorithmId`
and `algorithmVersion`, plus `modelId` when a model contributed. Payloads are
explicit variants:

| `payload.type` | Fields                                                      |
| -------------- | ----------------------------------------------------------- |
| `fact`         | `text`                                                      |
| `relationship` | `subjectId`, `relation`, `objectId`, optional `description` |
| `summary`      | `text`                                                      |
| `embedding`    | Nonempty numeric `vector`                                   |

A fact is a derived claim; a relationship is not consent. Embedding model,
preprocessing, and dimensional compatibility MUST be recorded by the derivation
identity/version and checked before use. Derived records can be regenerated
when algorithms change. Source data remains available until explicit authorized
deletion; summaries do not justify silent source deletion. Deleting or losing
access to source events requires deleting or recomputing dependent derived
records and indexes. Retention of older backups needs a separate policy.

The [event](examples/memory-event.json) refers to the synthetic watering world
event; the [summary](examples/derived-memory.json) derives from that event.
Storage, querying, deletion propagation, cross-world mapping, and derivation
execution are not implemented.
