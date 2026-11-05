# ADR 0004: Transport and execution boundaries

Status: Accepted, 2026-11-05.

Updated by [ADR 0007](0007-host-owned-behavior.md): current bridges exchange
host-driven plans/dialogue. This historical action-first wording does not require
or authorize IfSoul movement/combat/pathfinding implementations.

## Context

Game mod APIs, process boundaries and model providers vary. A mandatory transport
would couple character data to one integration mechanism.

## Decision

Define WorldAdapter semantics independently of transport. Start the first future
simulator with an in-process bridge. Add MCP, IPC or HTTP only for a demonstrated
integration need. Capabilities, actor permissions and perception are distinct.

The runtime receives injected MemoryPort, WorldAdapter and ModelProvider
implementations. The composition root handles database clients, providers and
secret lookup. Permissions are checked before dispatch and game constraints are
rechecked by the adapter at execution. Games own authoritative outcomes.

## Consequences

A timeout can leave an unknown outcome; retries require an adapter-specific
deduplication/status mechanism, not an assumption of exactly-once delivery.
Record observation/action/result metadata, not hidden model reasoning. Imported
memory and tool outputs remain data, never authority. A transport wrapper is not
evidence that a real game adapter or its permissions are implemented.
