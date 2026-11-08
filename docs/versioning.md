# IfSoul versioning

The common current release is **0.3.0**. All eight repositories, current package
artifacts and current format families share this identifier. Each independent
checkout carries `release.json`; `pnpm check:version` checks its manifest and exact
IfSoul artifact pins. The Core policy coordinates the release without imposing a
private service or sibling source dependency on public consumers.

While 0.x, patch releases contain compatible fixes and minor releases may break
contracts. Stable 1.0 requires an explicit compatibility/support decision.
Alpha/beta channels require explicit approval and are not the default.

Format families retain descriptive names. Exact family/version validation is
required; equal versions do not imply matching shapes, host capabilities or
execution authority. See [compatibility](compatibility.md) for current and legacy
readers. Frozen historical bytes and original stored evidence remain unchanged.
A new release prepares all manifests, metadata, writers, artifacts, receipts and
docs together, then runs local gates and independent acceptance. Git tags, registry
publication and production deployment are separate authorized actions. No version
field proves that any of those happened.

## Historical versioning policy (superseded for current release coordination)

# Versioning

The built public package is `@ifsoul/core@0.2.0-alpha.1`. It has explicit ESM and
declaration exports but has not been published to npm. Consumers use reviewed
pinned tarballs with checksums and provenance. SDK remains independently versioned
at `@ifsoul/adapter-sdk@0.1.0-alpha.1`; see [ADR 0014](decisions/0014-repository-product-split.md).
No version field creates a Git tag, registry release or stability promise.

## Separate version dimensions

| Surface                                          | Policy                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Repository snapshot                              | SemVer-style prereleases while experimental; version lives in package.json          |
| Protocol and archive schemas                     | Their own explicit versions under the [compatibility policy](compatibility.md)      |
| Source ports and laboratory HTTP API             | Experimental; document consumer-visible breaks and test affected callers            |
| Future published SDK packages                    | Define exports and support policy before publication; explicit experimental exports |
| Character/template and host vocabulary revisions | Follow the corresponding contract, not the root package version                     |

Stable 1.0 requires an explicit compatibility and support decision. Before that,
breaking source/API changes still require a changelog entry and compatibility
review; draft status does not permit silent loss or reinterpretation of data.
A future prerelease is prepared by updating the manifest and changelog together,
running the applicable local checks, then explicitly authorizing any Git tag or
remote publication. Package-manager lock consistency is checked with frozen install.

The accepted schema/example inventory is
[baseline.json](../tests/contracts/fixtures/baseline.json). Existing contract tests
verify its paths and exact bytes. There is deliberately no auto-update command.
A new contract version requires an explicit compatibility decision and reviewed
inventory additions; historical baselines stay intact. Checksums detect drift,
not authorship or semantic compatibility. Review baseline/test changes themselves.

## Initial commit readiness

Inspect the complete prospective commit because no previous revision exists.
Run `pnpm check` and `pnpm build` locally; inspect `git diff --cached --stat`
and run `pnpm check:boundaries` after staging. The latter also checks indexed
file names and blob contents so a clean working copy cannot hide an older staged
secret. Review licenses, original fixtures and secret boundaries separately.

Local checks can be skipped or edited; they cannot enforce remote merge policy.
A maintainer reviews the exact revision and changes to checks before acceptance.
Remote CI, branch protection, repository creation and publication remain separate
owner decisions. The private reporting route is documented in [SECURITY.md](../SECURITY.md).
The owner authorized creation of the public `openifsoul/core` repository and
its initial Git setup on 2026-11-05; this does not authorize remote CI or deployment.
