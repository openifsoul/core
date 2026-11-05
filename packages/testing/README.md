# Local testing helpers

`src/laboratory.ts` supplies temporary-directory cleanup and a bounded CLI child
process runner for the laboratory integration suite. It contains no parallel
runtime, storage implementation, provider or gameplay controller. Production
components do not import this helper.

Run `pnpm test:lab` for executable laboratory tests, `pnpm test:runtime` for
runtime/storage tests, or `pnpm check` for the accepted local checks.
`pnpm check:contracts` retains static v0.1/v0.2 schema and example validation;
the laboratory does not edit those fixtures.

Tests use original synthetic data, temporary SQLite files, subprocess restarts
and actual runtime/storage calls. They check partial host adoption, memory-based
replies, changed/missing evidence, repeated demo behavior, persisted history,
safe failures, child exit and lock cleanup. They do not establish real-provider
behavior, archive import/export, network identity, cross-game compatibility or
consent/revocation workflows.
