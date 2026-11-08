# ADR 0015: one coordinated IfSoul release

Status: accepted by the owner on 2026-11-09; target 0.3.0 without alpha.
Supersedes independent current package/SDK/ModelProvider release numbering in ADR
0014 and older versioning guidance. Repository ownership and dependencies remain.

All eight repositories and current format families share one release identifier.
Each independently usable checkout carries release metadata and local equality
checks. No public repository depends on private coordination or sibling source.
Formats retain names and exact validators; equal numbers do not imply equal shapes.

Frozen old schemas/examples remain immutable historical inputs. Explicit version
readers/adapters validate original payloads/checksums; stored data is not relabelled.
Current writers use 0.3.0. General Core archive import is not implemented; App's
filtered fork remains a distinct family and creates new identity without rights.

In 0.x, patch releases contain compatible fixes and minor releases may break
contracts. Stable 1.0 requires an explicit support decision. Alpha/beta require an
explicit channel decision. Git/npm/deployment actions remain separately authorized.
See [versioning](../versioning.md) and [compatibility](../compatibility.md).
