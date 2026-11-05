---
name: documentation-sync
description: Synchronize IfSoul documentation and diagrams after changes to behavior, commands, contracts, architecture or implementation status.
---

# documentation-sync

Use [development](../../../docs/development.md),
[architecture](../../../docs/architecture.md), [compatibility](../../../docs/compatibility.md)
and [deployment](../../../docs/deployment.md) as the corresponding rule owners.
Read the changed implementation and manifest before updating claims.

Map each changed fact to its primary document and the README/diagram that presents
it to users. Update only affected claims and links; prefer linking to a maintained
source over duplicating a command catalog or policy. Keep implemented behavior,
experimental interfaces and future products distinct. Check diagrams for the same
authority and deployment boundaries as the prose. Historical ADRs retain their
history; update current guidance or add a superseding decision when appropriate.

Run formatting and `pnpm check:docs`. Links passing does not prove factual accuracy:
review commands against package.json and behavior against implementation/tests.
If a verified security contact or publication URL is missing, report the gap;
do not fabricate one. Report updated documents and unresolved documentation gaps.
