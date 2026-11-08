# Security and privacy design

This is a threat model and a set of implementation requirements. The experimental implementation includes runtime, storage, real providers and
a private owner web laboratory. Implemented controls and limits are documented in
[public/private boundaries](public-private-boundary.md) and
[web laboratory](web-laboratory.md); the wider threat model remains a requirement. Schema validation is not a security review or proof of authorization.
The revised contracts are [current contracts](../specs/current/README.md); original v0.1 remains
historical. See [SECURITY.md](../SECURITY.md) for the private reporting route and current support limits.

## Assets and trust

Protect private observations/conversations, character history, relationships,
derived data/embeddings, local policy and consent, provider keys, archives,
backups, writer ownership, and integrity of host plan/dialogue exchanges.
Threats include hostile imports, prompt injection in memory/tool results,
overbroad adapter/provider access, credential leakage, duplicate host work after
timeouts, cross-channel leaks, writer split-brain, and web-origin attacks on a
future localhost service. A compromised local user account or operating system
is outside a reliable application isolation guarantee; local-first alone does
not provide encryption, authentication, or protection from local malware.

The composition root is trusted to establish identity mappings, writer
ownership, and policy and configure implementations. Host games/mods own all NPC
mechanics, state machines, movement, shooting, pathfinding, adoption, and
execution. IfSoul and first-party bridges implement none of those mechanics.
Provider output, imported files, profile text, observations, memory, semantic
descriptions, and tool results are untrusted data. A checksum proves byte
consistency, not authorship, safety, consent, or license rights.

## Least privilege, scope, and consent

Runtime receives narrow injected ports. Bridges do not receive the full
archive/MemoryPort; providers and external AgentControllers receive only
selected authorized context. A full controller is not an inference provider or
an execution/policy authority. No text, model proposal, imported policy-shaped
record, or capability advertisement grants permissions. Apply trusted policy
before offering proposals for adoption, then check current host restrictions
again. Use default deny. The separate historical v0.1 policy format has
exact-match revoke precedence; v0.2 does not embed that wire format or imply an
automatic identity mapping. Do not treat a recorded allow decision as a bearer
token.

Every access must bind character, embodiment, environment/session, and
participant/channel identities through trusted mapping. v0.2 `private` has one
intended participant, `participants` lists its explicit audience, and `public`
means an environment audience rather than permission to publish on the Internet.
Validate the semantic scope/cardinality rules independently of schemas. Derived
data must be no more accessible than every source permits; reject derivation
across contexts without trusted mapping.

Access, export, backup, and remote-provider disclosure are separate operations.
An `allowed` export flag still requires authorization; `consent-required` needs
verifiable applicable consent; `forbidden` is excluded. A future local consent
mechanism must record the subject, purpose, data scope, applicable duration, and
revocation state outside untrusted imported claims. This is a design
requirement, not a new consent schema. Recheck consent when used. Local
possession, character names, relationships, and public-environment visibility
are not consent. Stable user relations require trusted cross-session mapping,
not equal display names. Game and chat channels can coexist without sharing each
other's private context.

## Import and archive handling

A future importer must validate schema/version support, extension requirements,
identity/references, file roles, exact uncompressed byte sizes and checksums,
and limits before committing data. Validate on a copy/staging area and leave the
source unchanged on failure. For separately named ModelProvider tool
schemas, reject remote reference fetching and apply local allowlists/complexity
bounds before compilation. v0.2 host intents instead require validation of typed
parameter descriptors and values, including required names, choices,
units/ranges, and authorized entity references. Bound document size,
string/array depth and length, entry count, expanded bytes, compression ratio,
and processing time. Concrete limits are still to be selected and tested for
concrete operations, including limits already bounded structurally by the draft
schemas.

Normalize and confine archive paths to an isolated extraction root; reject
absolute/traversal paths, symlinks, hard links, special files, duplicate
entries, platform case collisions, and files absent from the manifest. Do not
execute imported content. Restricted ASCII path syntax does not replace
filesystem containment checks. Parse JSON/JSONL safely and reject incompatible
required extensions. Preserve unknown optional extensions in a lossless path or
explicitly record filtering; never quietly remove properties until validation
succeeds.

v0.2 `complete-authorized` filtering includes all data authorized for that
transfer/backup, with no omissions or external references. It is not
unrestricted access. Any exclusion requires `filtered` mode and recorded
reasons/categories; external references must be declared where retained. Loss
reports must avoid exposing withheld content or private IDs. Neither mode
contains keys, tokens, owner addresses, or provider configuration. Backup
encryption and key recovery need a separate implementation policy; the manifest
is not an encryption scheme.

## Injection, planning, and communication safety

Keep trusted instructions/policy separate from untrusted memory, model
responses, world payloads, and tool results. Text such as “ignore restrictions”
remains data. Do not evaluate imported text as code or grant
filesystem/network/tools because a profile requests them. Validate high-level
plan intents/typed parameters, reference reachability, dependencies, scope, and
profile. Runtime authorizes proposals; host adoption/execution remains
separately checked. Partial/cancelled model output cannot cause host work
automatically. Authored backstory cannot become lived factual evidence merely by
appearing in context.

Enforce explicit context, output, request/retry, usage, and deadline budgets.
Fallback can wait, take no action, or use bounded rules; it cannot widen
authority. A stale context or missed deadline cannot silently become a valid
plan for a changed situation. Partial acceptance is not partial execution;
acceptance is not completion. Reconcile unknown/partial host work before retry
and preserve unresolved uncertainty. Cancelling a wait is not host-confirmed
cancellation. Assigning a fresh ID can duplicate effects. Model retries can
incur additional usage/charges. Provider/controller failure leaves host safe
autonomous behavior in charge, with no model call per tick.

Planning cadence and communication policy are independent. Requested-only
communication permits no unsolicited speech, including during daily briefing.
Dialogue needs an explicit host/channel request and compatible embodiment. A
generated response is not evidence of delivery. Future live conversation does
not create low-level game control or permission to initiate messages.

## Secrets and diagnostics

Keep provider keys in a dedicated trusted local secret boundary supplied to
concrete clients. Choose OS-protected storage or another explicitly assessed
mechanism before accepting real credentials. Never put secrets in character
profiles, archives, memory, model prompts, repository files, URLs, traces, or
errors. Separate the ModelProvider port from vendor implementation imports;
runtime has no key access. Remote clients need explicit disclosure policy and
retention review for the selected service. Bootstrap requires no credentials.

Diagnostics should default to identifiers/references, status, safe limits/usage,
and a brief explanation. Payload capture must be explicit, minimized, scoped,
and retained for a defined period. Redact at collection and sanitize upstream
errors; post-hoc string replacement is insufficient. Hidden model reasoning is
not required or stored. Logs, crash reports, caches, and indexes can contain
personal data and need access/deletion controls of their own.

## Deletion, revocation, and backups

Authorized deletion removes source data and deletes or recomputes dependent
summaries, facts, relationships, embeddings, indexes, caches, and controlled
diagnostic copies. Revocation of access must stop future retrieval/disclosure
and invalidate affected derived data. Preserving raw history against silent
summarization does not override a user's explicit deletion request.

Before real data is stored, define retention for backups, exports, provider-side
copies, and logs; distinguish immediate removal from active storage from expiry
of retained backups. A restore must reapply deletion/revocation records or use
an equivalent process to avoid resurrecting removed data. Old immutable backups
may require expiry rather than selective editing; disclose this limitation and
test restore behavior. Do not promise deletion of copies outside application
control or of remote-provider data without verified service support.

## Writer ownership and hosted placement

The initial design has one active character-state writer with multiple scoped
game/chat channels. Resume requires an explicit ownership handoff/checkpoint and
fencing of the previous writer; archive possession or a disconnect is not proof
that it stopped. Fork creates a separate continuation with parent provenance. A
future implementation needs enforceable writer recovery to prevent split-brain;
automatic merge and multi-writer synchronization are deferred. Checkpoints
cannot restore old permissions or mechanically resume host work without
reconciliation.

The public runtime/host can be local, self-hosted, or hosted by managed cloud.
Private accounts/billing/provisioning do not become public runtime dependencies.
Hosted mode with a local connector requires protected transport, authenticated
connector/session binding, tenant isolation, revocation, and defined retention.
BYOK billing is separate from location; moving runtime does not authorize key or
archive disclosure. No hosted mode or connector is implemented.

## Future local service

Bind only intended local interfaces, but treat loopback as reachability rather
than authentication. Require unpredictable per-session authentication, validate
Host/origin, prevent CSRF, and authenticate every API and event/WebSocket
channel. Use restrictive origin policy; CORS alone is not authorization. Keep
credentials out of query strings, protect session handoff/storage, and expire
sessions when the owned application session ends. Consider hostile websites, DNS
rebinding, other local users/processes, and stale sessions during review. No
server exists and no such controls have been tested in bootstrap.

## Gates before real data

The first local slice must test scope/consent isolation,
rejected/stale/partially accepted plans, requested-only speech, safe archive
rejection, secret-free diagnostics, bounded fallback, unknown host outcome
reconciliation, one-writer resume/fork, provider switching, deletion
propagation, and restore behavior. A future service additionally needs
unauthorized-session/origin tests. Set concrete resource limits and a reporting
channel before public release; record the results without claiming schema checks
prove runtime security.
