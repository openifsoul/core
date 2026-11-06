# Architecture decisions

The owner accepted these bootstrap recommendations on 2026-11-05. Acceptance of
an architecture direction does not mean its runtime implementation exists.

| ADR                                                                                   | Status                                                   |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [0001: Workspace and repository boundaries](0001-workspace.md)                        | Accepted                                                 |
| [0002: Protocol format and versioning](0002-protocol.md)                              | Accepted for draft bootstrap                             |
| [0003: Local storage and portable archives](0003-storage.md)                          | Direction accepted; implementation validation deferred   |
| [0004: Transport and execution boundaries](0004-bridges.md)                           | Accepted                                                 |
| [0005: Local character management UI](0005-manager.md)                                | Direction accepted; UI implementation deferred           |
| [0006: Licensing](0006-licensing.md)                                                  | Accepted                                                 |
| [0007: Host-owned behavior](0007-host-owned-behavior.md)                              | Accepted; supersedes action-first interpretation of 0004 |
| [0008: Portable characters and environments](0008-portable-character-environments.md) | Accepted; v0.2 extends 0002                              |
| [0009: Runtime host and product modes](0009-runtime-host-and-product-modes.md)        | Accepted; amends cloud dependency restriction            |

- [0010: First executable local runtime slice](0010-local-runtime-slice.md): accepted scope; experimental local implementation.

Change decisions explicitly through a new or amended ADR. Preserve the reason,
consequences and distinction between an accepted direction and measured behavior.

- [0011 — Browser demo SDK](0011-browser-demo-sdk.md): original hosts, experimental transport, invitation budgets and bounded browser history.

- [0012 — IfSoul App identity and local laboratory](0012-app-auth-and-local-laboratory.md)

- [0013 — Independent game examples and an installable experimental SDK](0013-independent-game-examples.md)

- [0014: independent public libraries and product compositions](0014-repository-product-split.md).
