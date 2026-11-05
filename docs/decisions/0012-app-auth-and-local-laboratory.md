# ADR 0012: IfSoul App identity and local laboratory

Status: accepted for local implementation, 2026-11-05. Supersedes the
invitation access policy in [ADR 0011](0011-browser-demo-sdk.md).

## Decision

IfSoul App is one open application with two deployment modes. Local mode runs
on loopback without Clerk or a mandatory account. Cloud mode verifies Clerk
sessions and partitions persisted characters, memory and encrypted BYOK settings
by the verified user identity. Google and email are the only intended sign-in
methods; configure that restriction in the Clerk instance, not merely in UI copy.

The sidebar-07 application shell exposes characters, conversation, memory and
settings. Laboratory is a local-only debugging section. Cloud routes must reject
laboratory operations even when a caller bypasses navigation. Ordinary chat must
not manufacture synthetic game outcomes. Browser games remain separate host
examples, with host-owned mechanics and bounded decisions.

A client-provided user ID, character ID or forwarded header never establishes
account ownership. The cloud composition authenticates before selecting a user
Durable Object. The previous owner object is not assigned to a new account.
Account isolation does not imply automatic migration, synchronization or deletion.

Invitations are removed. Scenario demos remain available without inference.
Cloud model access uses Clerk identity with persistent per-user and shared global
budgets. Browser resets, separate application objects and additional tabs must
not replenish the global allowance. BYOK credentials remain server-side and
separate from memory. Local use does not contact Clerk.

## Execution and acceptance

All implementation, tests and builds run locally. No publication, push, deployment
or remote workflow is authorized by this decision. Live Google/email verification
requires a separate test Clerk instance, to be configured through the user's
browser after implementation. A local test using signed fixtures does not prove
that a real Clerk instance has its permitted methods configured correctly.

Keep the existing Durable Object class and migration identifiers stable. Use
new object names for authenticated user stores; never destructively migrate the
old owner store. See [deployment policy](../deployment.md) for setup and remaining
verification limits.

## Release authorization amendment — 2026-11-06

The owner subsequently authorized final verification, manual GitHub source
publication and production deployment after Clerk/DNS readiness. This supersedes
the initial local-only release restriction, not the authentication, isolation,
local-only laboratory or no-automatic-CI boundaries. Live production results must
be recorded only after deployment and observed sign-in.
