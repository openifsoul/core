# ModelProvider contract

This provider boundary remains independently versioned at `draft-0.1.0` while
the [character/environment design](../v0.2/README.md) advances to v0.2. A provider
performs inference; an external AgentController is a separately planned runtime
strategy, not a synonym for a provider or permission to execute game commands.

ModelProvider is a planned boundary for structured model input/output,
capability declaration, usage, cancellation/deadlines, and safe errors. It is
independent of a vendor, SDK, game, cloud account, and transport. This bootstrap
contains no model client or inference implementation and does not require a key.

The [model-provider schema](../../packages/protocol/schemas/model-provider.schema.json)
is a tagged union. Every variant requires `schemaVersion` and `kind`:

| `kind`                  | Required additional fields                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `provider-capabilities` | `providerId`, `modelId`, `toolCalling`, `structuredOutput`, `cancellation`, `usage`          |
| `model-request`         | `requestId`, `providerId`, `modelId`, `messages`, `toolChoice`, `outputFormat`, `deadlineAt` |
| `model-response`        | `requestId`, `providerId`, `modelId`, `recordedAt`, `status`, `output`, `finishReason`       |
| `model-error`           | `requestId`, `providerId`, `modelId`, `recordedAt`, `error`                                  |

Capabilities apply to the exact `providerId` + `modelId`. `toolCalling: false`
requires requests to omit tools or use an empty array with `toolChoice: "none"`.
`structuredOutput: false` requires `outputFormat: "text"`. Unsupported features
MUST be rejected explicitly, never silently removed or emulated as a claimed
native guarantee. `usage` indicates whether usage can be reported; omission
means unknown, never zero. Local rules strategies do not need to pretend to be
model providers.

Requests contain a nonempty `messages` array of `{ role, content }` where role is
`system`, `user`, `assistant`, or `tool`. Optional assistant `toolCalls` contain
`toolCallId`, `name`, and object `arguments`; tool-result messages reference a
`toolCallId`. Tool calls belong only to assistant messages, tool results require
a prior matching call, and non-tool messages MUST omit `toolCallId`. These are
semantic checks, not enforced by the enclosing schema. Context selection and
trust placement are application responsibilities; untrusted memory/tool text
MUST NOT become trusted system instructions.

Optional tool definitions contain `name`, `description`, and `argumentsSchema`.
Names and call IDs MUST be unique in their respective request/response context.
Arguments schemas require separate safe meta-validation and argument validation.
`toolChoice` is `none`, `auto`, or `required`; `required` needs at least one tool.
`outputFormat` is `text` or `json-object`; for the latter, a consumer MUST parse
and verify `output.text` as a JSON object. It does not imply a particular domain
schema. Optional `maxOutputTokens` requests a provider-supported output bound;
there is no context-window or billing guarantee. Unsupported limits are rejected.

`deadlineAt` is UTC scheduling time. Optional `cancellationId` correlates a
future transport's cancellation signal; the schema does not implement the signal
or define a wire message. `cancellation` is explicitly `unsupported` or
`best-effort`. Best effort can stop waiting/generation where supported but cannot
promise rollback, no usage, no billing, or that an upstream request never ran.
Unsupported cancellation MUST be reported by capabilities and checked before use.

A response's `output` contains `text` and `toolCalls` (possibly empty). Status is
`completed`, `incomplete`, or `cancelled`. Future consumers MUST enforce these
semantic combinations: completed uses finish reason `stop` or `tool-calls`;
incomplete uses `length`; cancelled uses `cancelled`. `tool-calls` requires
nonempty calls supported by the selected tools; `stop` has no pending tool calls.
Partial/cancelled output MUST NOT trigger execution automatically. A model tool
call is a proposal; it must become a separately validated, authorized world
Action before execution.

Responses and errors correlate `requestId`, `providerId`, and `modelId` to the
request. Usage optionally contains nonnegative `inputTokens`, `outputTokens`,
and `estimated`; estimates MUST stay labelled and omitted counts MUST NOT be
fabricated. No currency, pricing, or normalized cost contract is defined. Usage
may be present on failure or cancellation.

Errors use `code`, safe `message`, `retry`, and optional `retryAfterMs`. Examples
of codes are `unsupported-feature`, `invalid-request`, `rate-limited`,
`unavailable`, `deadline-exceeded`, and `cancelled`; codes are extensible opaque
IDs, so callers handle unknown codes conservatively. Never include credentials,
raw private prompts, or upstream secrets in errors. A retry hint is not an
idempotency guarantee: a timed-out provider request may have consumed usage and
a repeated request may generate different output or another charge. Preserve
request provenance and apply local budgets before a retry. Rules decisions can
be reproducible; replay of recorded output reproduces that fixture; live model
responses are not promised deterministic across models or versions.

Positive synthetic examples: [capabilities](examples/capabilities.json),
[request](examples/request.json), [response](examples/response.json),
[error](examples/error.json). Response and error are alternative outcomes, not
two mandatory messages. No hidden model reasoning is required or stored.
