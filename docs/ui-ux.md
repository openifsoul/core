# UI ownership

Public App and private Website own web panels and their React/TypeScript/shadcn layout policies. Core contains no UI. See the [maintained owner](https://github.com/openifsoul/app) and
[repository split](decisions/0014-repository-product-split.md).

Core checks library contracts/runtime/storage/providers only. Consumer UI and
browser tests run in their owning repositories. Historical release records and
ADRs describe the former monorepository and are not current Core commands.
