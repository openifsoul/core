# Public libraries and private operations

Core owns protocol/runtime/memory/permissions/providers. Public SDK owns bounded
bridges and a synthetic host; public App owns the self-hostable local server,
character service and laboratory. Private Website owns public-facing branding and
Playground composition. Private Cloud owns managed Workers authentication,
quotas, per-user storage routing, provisioning and production operations. See
[ADR 0014](architecture.md).

No public repository imports private source or requires an IfSoul account. Cloud
may compose public built artifacts, never the reverse. Core has no Clerk, UI,
game, Worker composition or deployment configuration. Inspectable source grants
no access to the owner's running service; a private repository is not a security
control. Authentication and authorization must hold regardless of source access.

Deployment settings, account credentials, inference/encryption keys, databases,
player conversations and operational logs never belong in public source or
artifacts. Keys are not character history, prompts, exports or browser bundle
contents. Composition roots own trusted authentication, key storage, provider
selection and quotas. Core receives injected ports and bounded authorized inputs.

The private composition preserves verified identity before user-store selection,
shared owner-funded quotas independent of user partitions, encrypted key storage,
and safe response limits. Public local App remains loopback-only with Host/Origin
protection and no Clerk requirement. Laboratory debug operations are local-only.
Extraction tests are not production verification or a formal security audit.
