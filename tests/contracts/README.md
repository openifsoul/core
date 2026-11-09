# Local current-format contract checks

Run `pnpm check:contracts` from the repository root. Tests compile only the current
0.4.0 schemas with strict Ajv2020 and locally registered references. Validation
never coerces values, applies defaults, removes unknown fields or fetches schemas.

`current.test.mjs` checks every current protocol and ModelProvider specification
example and rejects wrong kinds/unknown versions. `semantics.test.mjs` covers
planning/conversation correlation, scope, required extensions, cancellation,
archive identities, exact declared file bytes/checksums and original evidence.
`current-helpers.mjs` is a test-local registry/assertion helper, not a migration API.
Obsolete contract baselines and acceptance fixtures have been removed.

Runtime, provider, persistence, archive-import and transport tests belong to their
owning suites. A structural schema pass is not proof of host authority, performed
actions, model quality, portable restore or production readiness. Use synthetic
fixtures and preserve input bytes on failed validation. Existing stored records
must not be silently relabeled or reset to make a current check pass.
