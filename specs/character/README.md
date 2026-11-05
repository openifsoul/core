# Character and archive contracts

Historical v0.1 contract. See [v0.2](../v0.2/README.md) for the current design;
the v0.1 JSON examples remain unchanged for regression checks.

A template is reusable authored material; an instance is an individual portable
character with separately referenced history. Importing a template MUST NOT
silently import a person's conversations, memories, relationships, owner
identity, or provider configuration. Closed template fields reject history.
Template edits create a new positive integer `revision`; existing instance
profiles do not automatically change when a template changes.

| Document          | Required fields beyond `schemaVersion`, `kind`                                    |
| ----------------- | --------------------------------------------------------------------------------- |
| CharacterTemplate | `templateId`, `revision`, `profile`, `provenance`                                 |
| CharacterInstance | `characterId`, `createdAt`, `profile`, `historyEventIds`, `relationshipMemoryIds` |
| Archive manifest  | `archiveVersion`, `archiveId`, `createdAt`, `schemaVersions`, `files`, `filter`   |

`profile` contains `name`, `description`, and `traits` (a map of simple strings,
numbers, or booleans). A template's `provenance` requires nonempty `authors` and
`license`; an optional `source` describes origin. These are claims to verify,
not automatic proof of rights. An instance's optional `template` is an exact
`templateId` + `revision` reference, not inheritance or a remote fetch request.
`historyEventIds` refer to its memory events; `relationshipMemoryIds` refer to
its derived records whose payload type is `relationship`. An empty array means
there are no referenced records at that snapshot, not that a deleted history
can be reconstructed.

Preferences and goals may be represented as explicitly documented traits or
namespaced extensions in this small baseline. Experience is represented by
memory events and derived summaries; dedicated preference, goal, skill, or
experience fields are deferred. A consumer MUST preserve unknown optional
extensions or declare losses; it MUST NOT flatten richer input into this profile
and silently discard unsupported state. Profile text does not grant permissions.

## Archive manifest

The manifest describes files; it is not an importer, container format, database,
or encryption scheme. `archiveVersion` versions the archive layout independently
of wire `schemaVersion`, even though both are `draft-0.1.0` now.
`schemaVersions.protocol` declares the contract baseline used. Every file entry
contains a safe relative `path`, `role`, `schemaId`, lowercase hexadecimal
`sha256`, and nonnegative `sizeBytes`. SHA-256 covers the exact uncompressed file
bytes, not a canonicalized JSON document. The manifest does not list itself.

The draft exchange layout uses one UTF-8 JSON document for template and instance
files, and UTF-8 JSONL for event/derived streams (one complete document per
nonempty line). Roles map to the `character-template`, `character-instance`,
`memory-event`, and `derived-memory` schema IDs respectively. Extension files
require their explicitly declared schema ID and reader support. This draft's
schema-ID pattern only admits baseline URNs; a new external extension file schema
requires a later agreed contract. Optional extension data can already live in
ordinary document `extensions`.

A future importer MUST independently check:

- Every listed file exists, matches its exact byte count/checksum, has the
  declared role/schema combination, and validates before use.
- Paths are unique and confined to the extraction root after normalization;
  platform case collisions, symlinks, archive entries absent from the manifest,
  decompression bombs, and oversized files are rejected. The schema's restricted
  ASCII path syntax is only the first check. No absolute paths or `..` segments
  are accepted.
- Referenced templates, instances, events, and derived records exist and have
  consistent identities, or the filtered manifest explicitly declares external
  references. Dangling references are not silently invented or discarded.

`filter` always contains `mode`, `omittedCategories`, `reasons`, and
`externalReferences`. `private-backup` means all data the exporter is authorized
to back up is included: omitted categories and reasons MUST be empty and
external references MUST be `none`. It is not a bypass of consent or access
restrictions. If any selected data cannot be included, use `filtered`, record
categories and nonempty reasons, and set `externalReferences: "present"` when
remaining provenance points outside the archive. That flag declares incomplete
closure, not authority to fetch data or expose omitted private IDs.

Keys, secrets, owner addresses, provider configuration, and access tokens are
outside this archive contract. Checksums detect changed bytes; they do not
identify a trusted author. Import/export, deletion propagation, migrations,
round-trip guarantees, and archive size limits remain unimplemented.

Positive examples: [template](examples/character-template.json),
[instance](examples/character-instance.json), [manifest](examples/archive-manifest.json).
The manifest's two sibling files form a synthetic initial snapshot.
