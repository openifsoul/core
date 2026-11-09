# Current IfSoul 0.4.0 contracts

Current character, environment, planning, conversation, memory and archive schemas
are in `packages/protocol/schemas/current` and use `schemaVersion: "0.4.0"`.
The corresponding examples are under this directory.
See [compatibility](../../docs/compatibility.md).

The current ModelProvider normative schema is `current/model-provider.schema.json`
with its own provider-common definitions and examples under `model-provider`.
Its shared release identifier does not change its envelope shape or turn callable
provider clients into an implemented wire transport. General Core archives remain
a specification/structural-validation surface, not implemented restore/import.
