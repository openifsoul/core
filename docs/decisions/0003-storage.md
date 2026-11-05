# ADR 0003: Local storage and portable archives

Status: Direction accepted, 2026-11-05; implementation validation deferred.

## Context and alternatives

Raw events, facts, relationships and derived summaries need distinct provenance.
JSONL files are inspectable and simple to append, but indexing, coordinated updates
and deletion across derived records become application responsibilities. SQLite
offers local transactional storage and indexed queries but introduces a storage
schema, migration work and packaging concerns. A database file alone is a weak
interchange contract across implementations.

## Decision

Recommend SQLite behind a small MemoryPort for the first implemented engine.
Export documented JSON/JSONL records in a portable archive with a manifest,
version declarations, file inventory and checksums. Do not make a SQLite binary
the sole export format. The archive container, compression and concrete migration
implementation are deferred until an importer/exporter exists.

Raw events are retained until explicit deletion; summaries and embeddings remain
rebuildable derivatives with source references. Full private backup and filtered
sharing are different export modes. Filters must be recorded, never disguised as
a complete history. Keys are excluded from both modes.

## Consequences and validation gate

Before declaring the engine ready, test round-trip preservation, selective export,
unknown extensions, deletion propagation, crash recovery, safe archive extraction,
and a real schema migration. Measure SQLite against actual workload and packaging
requirements; revisit if the tradeoffs fail. Bootstrap implements none of these
storage operations. Branching, merging and cloud sync are later work.
