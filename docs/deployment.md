# Build and deployment policy

Accepted execution location: local machine, initially 2026-11-05 and preserved
by the repository split on 2026-11-06. Run `pnpm install --frozen-lockfile`,
`pnpm check`, `pnpm build` and `pnpm pack:core` locally in this repository.

Core is a public library and has no deployment target. App owns self-hosted
composition; private Website and Cloud own website/managed deployment. Cloud
hosting remains Cloudflare Workers with manually invoked Wrangler after local
checks. No production deployment or data/secret operation is part of this split.

No GitHub Actions, schedules, automatic registry publishing, provider builds or
automatic deployments are configured or authorized. A push is not a deployment.
No production monitor is configured. Repository settings, remote execution and
npm publication require a separate owner decision.

See [ADR 0014](decisions/0014-repository-product-split.md) for ownership and pinned
artifact provenance requirements. Historical deployment records describe the
former monorepository and are not current Core commands.
