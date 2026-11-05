# Permissions

Status: **planned; no implementation**. There is no evaluator, consent registry,
identity service, enforcement layer, or package entrypoint. The revised
[v0.2 specification](../../specs/v0.2/README.md) requires trusted authorization;
it does not embed a new permission-policy wire envelope. The original
[draft-0.1.0 policy/decision format](../../specs/world-adapter/README.md) remains
an independently versioned historical baseline, not an automatic v0.2 mapping.

## Input and output contracts

Inputs will be trusted policy, authenticated participant/environment identity,
requested operation, scope, consent, current communication/profile restrictions,
and bound context. Outputs will be explicit allow/deny decisions and safe
reasons/provenance. Concrete policy/consent APIs are deferred; this README adds
no wire fields or implied grants.

Use default deny and least privilege. If using the exact v0.1 evaluator baseline,
match exact subject/resource/action within its world/session: revoke takes
precedence, otherwise grant allows, and no match denies. It has no wildcard or
inheritance semantics. Using that format in a revised application requires an
explicit trusted mapping; copying IDs between versions does not authorize it.
A stored allow decision is evidence about a revision, not a bearer token or a
promise it stays current.

## Ownership and imports

Permitted IfSoul import: **`protocol` only**. The root loads trusted policy and
establishes character/embodiment/participant/channel mappings. Runtime checks a
proposal before it reaches host adoption; the host independently enforces
current restrictions and owns all NPC mechanics. Providers/AgentControllers,
profiles, imported policy-shaped data, and high-level intent advertisements
cannot grant authority. This package neither runs game mechanics nor reads the
whole memory store.

Planning cadence does not grant communication permission. Requested-only policy
requires an explicit host/channel dialogue request; a daily plan, model preference,
or persistent channel cannot independently permit speech. Constrained nonhuman
embodiments must not acquire unavailable expression channels. Concurrent chat
and game access must remain scope-isolated even under one state writer.

Memory access and export/disclosure are separate. In v0.2 scope participants are
explicit participant IDs: private has its intended participant, participants has
its explicit audience, and public means environment visibility rather than
Internet publication consent. `allowed` still needs authorization;
`consent-required` needs verifiable applicable consent; `forbidden` excludes
export. Stable user relations require trusted mapping, not equal display names.
See [security](../../docs/security.md).

## Criteria to begin implementation

Agree trusted identity/policy sources, API and version mapping, scope checks,
consent lifecycle, communication enforcement, and revocation behavior. Prove
default deny, applicable revoke precedence, cross-channel/environment isolation,
stale decisions, requested-only speech, access/export separation, and removal of
cached/derived disclosure paths after revocation. Schema success alone is not
enforcement.
