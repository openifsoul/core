# Execution and deployment modes

Status: **product deployment modes remain planned**. A local source-run CLI
composes runtime, SQLite and a synthetic host. There is no game connector,
inference client, managed deployment or self-hosting distribution.
This document names intended product modes; [deployment policy](deployment.md)
still requires local checks and a separate decision before actual deployment.
The revised protocol direction is [v0.2](../specs/v0.2/README.md).

## Runtime location and model billing

| Mode                    | Runtime and durable character state                 | Inference                                                        | Game connection                                          |
| ----------------------- | --------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| Local with local model  | User's machine/public headless host                 | Local provider; no network model needed                          | Local host connector                                     |
| Local runtime with BYOK | User's machine/public headless host                 | Selected remote provider with separately stored user credentials | Local host connector                                     |
| Managed hosted runtime  | Hosted instance of the public runtime/host          | Managed or explicitly supported BYOK provider                    | Authenticated local game connector to the hosted service |
| Public self-hosting     | User/operator deployment of the public runtime/host | Local, remote BYOK, or operator-selected provider                | Local or remote authenticated connector                  |

These are intended arrangements, not available installation choices. Rules-only
execution is another offline decision strategy where suitable. BYOK describes
credential/billing responsibility, not runtime location: BYOK can accompany a
local or a hosted runtime if supported and explicitly configured. Likewise a
local runtime is not necessarily offline. Managed hosting and managed inference
billing are separate product decisions.

The host game/mod always retains its NPC simulation. A connector transports
bounded context, proposed plans/dialogue, and host reports. It never transfers
movement, shooting, pathfinding, or state-machine implementation into IfSoul.
Provider/network unavailability leaves the host in its configured safe behavior;
there is no requirement for a network round trip each game tick.

## Public headless runtime host

The experimental [runtime-host application](https://github.com/openifsoul/app/blob/main/apps/runtime-host/README.md) is
a local CLI composition root for SQLite, runtime and the synthetic laboratory.
It is not yet a server or distribution. Future hosting will construct
memory/provider/controller/connector implementations, configure
trusted identity and consent, and inject ports into the runtime. Interfaces stay
separate from SQLite/vendor/transport implementations.

The runtime host is optional: embedded library and on-demand planning-worker
implementations can serve host-triggered requests without a permanent daemon or
model session; live conversation can use a persistent service.

The host must support the same open runtime for local and hosted placement.
Private account/billing/provisioning code may deploy or import public runtime
components and public ports; it cannot become a prerequisite for running them.
A public self-hosting route must remain possible without private packages or an
IfSoul account. Website content consumes public docs/metadata, not runtime state.
See [architecture](architecture.md) for permitted import directions.

## Channels and one active writer

Multiple authenticated game/chat channels may coexist for a character. They do
not each obtain an independent mutable copy. The first implementation will have
**one active character-state writer** that sequences accepted updates and scoped
memory records. Channels submit observations/requests through that owner; the
host game separately owns its authoritative simulation state. Cross-channel
ordering/conflict behavior requires explicit design and is not implemented.

Changing models does not transfer state ownership. Changing runtime location
requires an explicit checkpoint/handoff: stop or fence the previous writer,
transfer authorized state, validate the continuation, and activate the new owner.
A disconnect or imported archive is not proof that the previous writer stopped.
A future implementation must define enforceable ownership and crash recovery
before promising safe resume. Multi-writer sync and automatic merging are deferred.

A **resume export** is intended to continue the same character lineage with that
ownership handoff. A **fork export** makes a separate continuation with recorded
parent provenance and isolated future writes. Copying a file does not resolve
which operation occurred. Filtered exports disclose losses and preserve relevant
scope/consent constraints in either case; no archive mode grants new authority.
Exact lineage semantics belong to the versioned spec.

## Deployment trust boundaries

A local host must authenticate local clients and reject hostile web origins;
loopback binding alone is insufficient. A hosted connection additionally requires
transport protection, authenticated connector/session binding, tenant isolation,
revocation, and clear retention/export/deletion behavior. A local game connection
does not authorize a remote service to receive the whole archive or provider key.
Secrets remain separate from portable character data in every placement.

Before implementing a mode, choose concrete service lifecycle, trusted identity
binding, writer handoff/fencing, resource limits, secret provisioning, and failure
policy. Before deployment, record location, checks/build commands, trigger,
operator responsibility, and monitoring separately. This guide authorizes no
cloud resources, remote builds, publishing, or automatic workflow.
