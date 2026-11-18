# Roadmap

IfSoul provides character protocol/runtime primitives, scoped persistent memory,
provider clients, a bounded host SDK and a self-hostable App. Games own mechanics,
action adoption and execution. See [architecture](architecture.md),
[runtime API](runtime-api.md) and [resource budgets](resource-budgets.md).

## Host capability discovery

The 0.9.0 candidate adds native capability manifests and versioned owner grants.
Core's host intent descriptors remain game-neutral. The SDK validates discovery,
bounded input and operation reports. App projects a connected host's snapshot,
fences each authorization checkpoint by provider and revisions, and retains
observed steps for factual recall. Native host readiness and completed gameplay
are verified independently for each connector.

## Addressed group adventures

The 0.9.0 target includes a player-led adventure with three independent
characters. Group turns use verified participants and explicit audiences,
with bounded NPC-to-NPC exchanges and attributed native evidence. The App
target includes a durable owner transcript and an inspectable decision trace.
Adventure recall distinguishes eligible host receipts, unconfirmed assignments
and character dialogue. An action can fail in the native world while the
conversation accurately retains and reports the outcome. Local Mineflayer
verification has exercised addressed exchange, partial collection, failed
return attempts and retained App history across restart. In a natural forest
run, three actors each recalled their recorded outcome and the owner could
read the same history and decision trace in App after restart. An independent
local model check verified that a mixed return request without an available
return capability yields unknown results and no assignment.

## Conversation channel permissions

The 0.9.0 target separates listening, reacting and speaking for each
reported host channel. App owns versioned grants and the bridge reports
which channels exist. The Mineflayer adventure uses private and scoped
group replies. Public input can use a private reply route while the
bound player is tracked in the same dimension. The vanilla bridge reports
public speaking as unsupported because vanilla broadcast crosses dimensions.
The four Java plugin and mod bridges use
their host APIs for same-world public delivery.
Local tests exercised OpenAI and Ollama dialogue through App and actual
Minecraft Java clients. Local OpenAI and Ollama runs also exercised native
Mineflayer forest action receipts and per-actor recall. Long Java dialogue
turns renew the capability lease
while the host still verifies the player and actor.

## Relationship interpretation and revision

Relationship interpretation and revision are model-dependent. Current validation
and persistence checks do not establish reliable semantic reassessment.

IfSoul 0.8.0 carries approved participant identity and source
attribution into linked App Conversation. It preserves conflicting reports
as separate claims and stores relationship values from the NPC toward the
player, with links to the supporting events. Withdrawing consent removes the
affected source context while retaining the original records.

The App classifies the current request before answering. When it identifies
factual recall and no supporting records are available, Conversation shows an
insufficient-evidence status without generating a character reply. General and
creative dialogue stays available. Broader semantic reassessment across
providers and scenarios remains open.

## Memory and identity

The 0.6.0 App Memory view pages through owner-authorized retained events and
derived records with literal text search, exact world, session and entity
filters, and source links. Local SQLite indexes the owner and insertion
sequence. Saved originals remain available across prompt packing and restarts.
Model prompts use scoped, byte-bounded evidence projections. Native private
dialogue search remains under connection and session authorization.

- Semantic retrieval and embeddings alongside bounded source-preserving recall.
- Broader archive and distributed ownership/merge interfaces.
- App 0.8.0 extends the [participant/session foundation](sessions.md)
  with player-consented [linked Conversation](https://github.com/openifsoul/app/blob/main/docs/memory.md#continue-as-a-mineflayer-player-in-conversation)
  for an individual local Mineflayer companion.
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
and revisioned controls, including sessions without players. App 0.8.0
connects the planner to [Mineflayer groups](https://github.com/openifsoul/app/blob/main/docs/game-connections.md#run-a-mineflayer-group).
The 0.8.0 App and companion were verified with
three independently assigned characters, private per-character recall,
individual revocation and bounded continuation after the player left. The
group scheduler proposes assignments. Each client owns movement and reports the
observed result. A live socket transport remains a future milestone.

### Service composition

The App separates service-owned durable memory from provider selection and exposes an optional neutral customer balance, limits and final-price estimate capability. Managed commercial accounting belongs to the managed service composition. The Minecraft companion provides explicit local installation, pairing and connection controls; other host installers remain separate integration work.

Desktop's local Ollama composition configures a context window and input
estimate for `qwen3:8b`, with generation tokens reserved. Bridge recall asks
for original evidence phrases and separate citations when reports disagree.

### Minecraft App connection

The App provides a consent-based local companion for trusted Minecraft Java
1.20.2 servers. The player and operator approve the connection and select the
character, memory and provider. Separate movement and optional hostile-mob
defense grants allow bounded choices. Provider renewal preserves approved
connection memory. Game hosts own action adoption, movement, combat and outcome
reporting.

The App also offers server-side profiles for Citizens, Easy NPC, CustomNPCs
Unofficial and MineColonies. Operators provision a compatible server and
approve the player and NPC before pairing. The bridge checks the runtime,
identity and scope before processing dialogue. Independent local verification of
0.8.0 covered authorized native effects, stop or cancellation,
revocation, and Russian private recall of an observed host outcome across all
five bridges. For setup and supported actions, see the
[Minecraft connection guide](https://github.com/openifsoul/app/blob/main/docs/game-connections.md).

## Desktop application

Desktop uses Electron to package the App workspace, local service runtime and Minecraft
companion as a single installation. Service location, model provider and memory
ownership are independent choices. Core and SDK remain usable by other hosts.

Apple silicon Desktop uses an owner-signed update feed. The installers
remain unsigned. A local 0.7.0 installation accepted and relaunched the
0.8.0 macOS build while retaining its local data. The 0.8.0 supervisor
also restored the previous installed bundle and relaunched it after a
first-start exit or hang. See the
[Desktop guide](https://github.com/openifsoul/app/blob/main/docs/desktop.md).

IfSoul 0.8.0 retains the 0.4.0 serialized and wire formats.
Windows verification follows separately.
Windows and Linux updates, independent bridge updates, Linux packaging,
and scoped local MCP are separate milestones. Authenticated remote MCP is
a separate integration.
