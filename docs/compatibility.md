# Compatibility

The current design is **draft-0.2.0** for portable characters, environments,
host-driven planning and dialogue. [v0.2 contracts](../specs/v0.2/README.md)
are separate from the retained v0.1 schemas and examples. Both are drafts,
not a published working SDK. The ModelProvider boundary retains its own
`draft-0.1.0` envelope; an application selects the appropriate registry by
contract family and version rather than relabelling all messages.

| Exchange                                       | Status                                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| v0.2 document → matching v0.2 schema           | Structural checks; semantic/authority checks still required                            |
| v0.1 document → retained v0.1 schema           | Historical regression validation                                                       |
| v0.1 ModelProvider messages → v0.2 application | Planned composition of independently versioned contracts; not implicit wire conversion |
| v0.1 character/archive → v0.2                  | No migration implemented; reject automatic version-only conversion                     |
| v0.2 plan → host                               | Proposal only; host validation/adoption and reported execution are separate            |
| Any archive → restore/fork implementation      | Not implemented; schema validation does not restore a character                        |

The revision introduces an environment/embodiment distinction, chat without
compulsory world ticks, persistent character and participant identity, portable
intentions and memory levels, and host-owned planning/dialogue profiles. There is
no universal mapping from v0.1 action commands or world-scoped subject IDs into
these contracts. A future migration must request or derive trusted mappings,
preserve provenance, report unsupported state, validate a copy, and retain the
original input. Never relabel an old archive or treat an imported identity as a
writer lease. Restore and fork require explicit identity and lineage handling.

Unknown required extensions reject processing; optional extensions must be
preserved or losses explicitly reported. Module release versions, schema family
versions, archive versions, host vocabulary revisions and character state revisions
are independent. Wire-version agreement does not prove host intent compatibility,
model quality, participant ownership, consent or execution success.

## Historical v0.1 baseline

Status: frozen local **draft-0.1.0** contract baseline, not a published stable
protocol or an implemented compatibility layer. The exact
[schema registry](../packages/protocol/README.md) and
[field conventions](../specs/README.md) identify supported documents.

| Version dimension                  | Baseline                      | Meaning                                                |
| ---------------------------------- | ----------------------------- | ------------------------------------------------------ |
| Wire/data `schemaVersion`          | `draft-0.1.0`                 | Exchange envelope fields and semantics                 |
| Manifest `archiveVersion`          | `draft-0.1.0`                 | Archive layout and manifest rules                      |
| Manifest `schemaVersions.protocol` | `draft-0.1.0`                 | Contract set used by archive entries                   |
| Template `revision`                | Positive integer              | Exact authored template content                        |
| Policy `revision`                  | Positive integer              | Exact permission policy content                        |
| `capabilityRevision`               | Opaque ID                     | One adapter capability set                             |
| `worldRevision`                    | Optional opaque ID            | Adapter's optimistic world-state token                 |
| npm package version                | No protocol package published | Future distribution version, separate from wire format |

| Producer → consumer                                   | Supported now?             | Required handling                                   |
| ----------------------------------------------------- | -------------------------- | --------------------------------------------------- |
| `draft-0.1.0` document → its baseline schema          | Structural validation only | Then check semantic constraints and authorization   |
| Different or missing schema version → baseline schema | No                         | Reject with a clear unsupported-version error       |
| Unknown ordinary field → baseline schema              | No                         | Reject; do not drop it                              |
| Unknown optional extension → preserving consumer      | Planned rule only          | Preserve its JSON value losslessly                  |
| Unknown required extension → consumer                 | No                         | Reject before processing                            |
| Unsupported archive or entry schema                   | No                         | Reject before extraction/import mutation            |
| Unsupported tool/model capability                     | No                         | Explicit error; no silent downgrade                 |
| Any archive → importer / migration / runtime          | Not implemented            | Do not claim round-trip or behavioral compatibility |

All `$id` URNs are unique within this baseline and resolved by registering local
files; they do not claim a domain, service, registry publication, or hosted schema
endpoint. `common.schema.json` supplies reusable definitions and deliberately
rejects exchange documents itself. Permission and provider files expose tagged
unions; the other document schemas each have one root kind.

Field names, discriminators, identifier rules, scope meanings, status meanings,
required fields, and version constants are frozen for this local bootstrap.
Incompatible changes require a new explicit baseline, updated schemas/examples,
compatibility notes, and an architecture decision review. Before MVP, a draft
label does not authorize silent data loss or reinterpretation. Optional additions
to closed envelopes also need a version change; use documented extensions for
compatible optional data. A supported schema is not evidence that the consumer
understands every open payload type or extension.

Unknown required extensions MUST exist in `extensions` and be supported; both
are semantic checks. Unknown optional extension values MUST survive any claimed
lossless import/export, or the operation must reject or explicitly record a
filtered loss. They never become executable instructions or permissions.

A future migration runs on a copy, validates both sides, preserves the source,
reports unsupported data and reference losses, and has explicit tests. No
migration, automatic version negotiation, or archive importer exists here.
Future core packages are planned to start with coordinated releases; external
adapters version independently and advertise supported protocol versions. This
baseline has an exact supported-version list, no semantic-version range syntax.

Portability preserves supported data and provenance. It does not guarantee equal
behavior, identical model output, psychological identity, game-state equivalence,
provider feature parity, or compatibility with a game that has not been tested.
Scope/consent constraints may require filtered exports; these must disclose the
loss rather than claim complete portable history.
