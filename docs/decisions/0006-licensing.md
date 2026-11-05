# ADR 0006: Licensing

Status: Accepted, 2026-11-05.

## Context

Code, normative schemas, explanatory documentation and distributable character
content have different reuse needs. A root package license field is insufficient
to communicate all of them.

## Decision

Use Apache-2.0 for code, tooling, normative schemas and machine-readable contract
examples/fixtures. Use CC-BY-4.0 for explanatory prose and CC0-1.0 for original
character template data in `examples/characters/`. Document the scope and retain
the official license texts. See the [licensing policy](../licensing.md).

## Consequences

Contributors must have rights to their material. Existing games, mods, characters,
assets and dependency licenses are not relicensed by this policy. Review actual
adapter dependencies and distribution terms before release; no blanket claim of
game compatibility is made. Personal memories and other players' dialogue are not
public template content. Do not add a fictitious security contact or legal entity.
