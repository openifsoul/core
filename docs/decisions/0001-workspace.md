# ADR 0001: Workspace and repository boundaries

Status: Accepted, 2026-11-05.

[ADR 0009](0009-runtime-host-and-product-modes.md) clarifies that managed cloud
can host the public runtime and its ports; public code still cannot depend on
private services. Repository creation remains deferred as described below.

## Context

IfSoul needs an open foundation and independent game integrations, while managed
services and closed game code require separate access boundaries. Creating every
possible repository now would add maintenance without executable components.

## Decision

Start with one independent `core` repository. Its parent is a local workspace,
never a Git repository enclosing all projects. Core is a future package/application
monorepo. Do not use submodules. Original character examples start in core.

Create adapter-zomboid, a public characters catalog, private website and private
cloud repositories only when work begins. Last Call's adapter defaults to private;
its publication boundary needs separate review. Minecraft remains roadmap-only.
Public components never require private repositories or an IfSoul account.

## Consequences

The first checkout is useful on its own. A future public self-hosted server must
remain public, even if managed service operations are private. Local tooling and
checks are authorized; remote repositories and push require separate approval.
