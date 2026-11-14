# Roadmap

IfSoul provides character protocol/runtime primitives, scoped persistent memory,
provider clients, a bounded host SDK and a self-hostable App. Games own mechanics,
action adoption and execution. See [architecture](architecture.md),
[runtime API](runtime-api.md) and [resource budgets](resource-budgets.md).

## Relationship interpretation and revision

The [behavior configuration and dynamic parameter runtime](behavior.md) now provides
shared owner configuration, bounded evidence-linked values, directed relationships,
revision history and hard reaction gates.

Relationship interpretation and revision are model-dependent. Current validation
and persistence checks do not establish reliable semantic reassessment.
Improve source-grounded reassessment across providers and scenarios, including
contrary evidence, perspective, confidence and meaningful explanation changes.

## Memory and identity

The 0.6.0 App Memory view pages through owner-authorized retained events and
derived records with literal text search, exact world, session and entity
filters, and source links. Local SQLite indexes the owner and insertion
sequence. Saved originals remain available across prompt packing and restarts.
Model prompts use scoped, byte-bounded evidence projections. Native private
dialogue search remains under connection and session authorization.

- Semantic retrieval and embeddings alongside bounded source-preserving recall.
- Broader archive and distributed ownership/merge interfaces.
- Extend the [participant/session foundation](sessions.md) with host-specific identity and consent mappings.
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

## Session coordination

The [participant/session foundation](sessions.md) provides explicit identities,
addressed events, revisioned membership and authorized evidence projections.
The [bounded group planner and autonomous cadence](group-scheduler.md) now provide
shared-context proposals, explicit host outcomes, durable due/event/manual claims
and revisioned controls, including sessions without players. Live transport remains
a next stage, preserving per-character memory and host authority.

### Service composition

The App separates service-owned durable memory from provider selection and exposes an optional neutral customer balance, limits and final-price estimate capability. Managed commercial accounting belongs to the managed service composition. The Minecraft companion provides explicit local installation, pairing and connection controls; other host installers remain separate integration work.

Desktop's local Ollama composition configures a context window and input
estimate for `qwen3:8b`, with generation tokens reserved. Bridge recall asks
for original evidence phrases and separate citations when reports disagree.

### Minecraft App connection

The App provides a consent-based local companion flow for the Minecraft1.20.2 trusted offline-server connector: generated settings, independent game/service endpoints, owned character/memory/provider selection, restricted device grants and explicit connection controls. Provider renewal preserves the approved connection memory. Game mechanics remain host-owned; broader account modes and other adapters remain separate work.

The App also selects server-side bridge profiles for Paper and NeoForge.
Desktop can import a matching, checksum-pinned local IfSoul bridge JAR.
Server operators provision Minecraft and upstream mods and approve the target
player and NPC before pairing. The server-side adapter checks the matching
runtime declaration, identity and connection scope before dialogue. Citizens and
Easy NPC passed local private dialogue checks. MineColonies and CustomNPCs
Unofficial still await an in-game native client dialogue test. Russian
source-faithful recall with the local Qwen model remains unverified.

## Desktop application

The 0.6.0 desktop roadmap starts with an Electron package for macOS and Windows.
The App composition packages its workspace, local service runtime and Minecraft
companion as a single installation. Service location, model provider and memory
ownership are independent choices. Core and SDK remain usable by other hosts.

The Apple silicon Desktop updater implements user-initiated verification and
first-start rollback. Production updates are deferred. Future research will
assess signed feeds and payloads with owner-controlled Ed25519 trust. Test
builds use manual downloads. Windows and Linux updates, independent bridge
updates, Linux packaging, and scoped local MCP are separate milestones.
Authenticated remote MCP is a separate integration.
