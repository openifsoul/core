# Build and deployment policy

Accepted execution location: local machine, initially 2026-11-05 and preserved
by the repository split on 2026-11-06. Run `pnpm install --frozen-lockfile`,
`pnpm check`, `pnpm build` and `pnpm pack:core` locally in this repository.

Core is a public library and has no deployment target. App owns self-hosted
composition; private Website and Cloud own website/managed deployment. Cloud
hosting remains Cloudflare Workers with manually invoked Wrangler after local
checks. No production deployment or data/secret operation is part of this split.

The original split baseline permitted no automatic execution. The dated public-CI
exception below now permits GitHub Actions checks only. Schedules, automatic registry
publishing, provider builds and automatic deployments remain unapproved. A push is
not a deployment. No production monitor is configured. Repository settings, other
remote execution and npm publication require a separate owner decision.

See [ADR 0014](decisions/0014-repository-product-split.md) for ownership and pinned
artifact provenance requirements. Historical deployment records describe the
former monorepository and are not current Core commands.

## Authorized release on 2026-11-06

The owner subsequently authorized preparation, reviewed Git commits/pushes and
manual Cloud production publication after coordinator review and local validation.
The split-only restriction above describes the earlier baseline. This authorization
does not enable npm publication, remote builds, automatic execution, settings changes,
secret operations or data migrations. Production deployment evidence is recorded
separately after publication; preparation alone does not establish a deployed version.

## Public CI authorization on 2026-11-08

The owner authorized GitHub Actions checks on `push` and `pull_request` in this
public repository. This narrowly supersedes earlier no-CI/remote-execution rules;
release builds and release validation remain local.
Use GitHub-hosted Linux runners, Node 22.18.0 (within the manifest engine range)
and manifest-pinned pnpm 10.15.0 with frozen-lockfile installation. No secrets,
private checkout, paid model, production environment or self-hosted runner is used.
No deployment, npm publication, schedules, provider builds or settings changes are
authorized. Private Website and Cloud are excluded. Preparing a workflow does not
prove a GitHub run passed; activation awaits a separately authorized commit/push.

## Automated check coverage

`pnpm check` includes formatting, types, frozen contracts, runtime/provider tests, validators, documentation/boundary checks, build output and the existing packed Core consumer proof.

The workflow is `.github/workflows/checks.yml`: one Ubuntu 24.04 job with a
20-minute timeout and cancellation of superseded runs per event/ref. Only normal
`pull_request` and `push` events run; fork code never runs through
`pull_request_target`. Official checkout/setup-node actions are pinned to full
commit SHAs, checkout does not persist credentials, and token permissions are
limited to `contents: read`. Dependency caching and artifact uploads are disabled.
Registry installation uses public dependencies and reviewed in-repository vendor
archives. CI calls existing manifest gates without changing runtime contracts.

Local validation, GitHub-run results, browser acceptance, real-provider behavior
and production evidence are separate. No remote green result is claimed before
an actual run. Repository/fork approval rules may require an owner to approve a
first contribution; this task does not alter those settings. A public hosted job
uses runner and network resources; no paid providers or larger runners are used.

Deployment remains a separate owner decision. Managed hosting belongs to private
Cloud, using manually invoked Wrangler after local release gates and explicit
release authorization. A push does not deploy. No schedules, automatic publishing,
private Website/Cloud CI or production monitoring are configured by this workflow.
