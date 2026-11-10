# Laboratory providers and shared service

This slice adds actual model-client code and a platform-neutral shared laboratory
service. Mocked tests verify protocol/request handling; live access and a model's
answer quality must be checked separately in the configured environment. No
credentials or real conversations are committed.

## Callable provider boundary

`packages/model-providers/src/index.ts` exports:

```ts
type ProviderId = 'cloudflare' | 'openai' | 'ollama' | 'scenario';
interface ProviderSelection { provider: ProviderId; model: string }

createOpenAIProvider({ apiKey, fetch?, limits? }): ModelClient
createCloudflareProvider({ invoke, limits? }): ModelClient
createOllamaProvider({ baseUrl?, fetch?, limits? }): OllamaClient

client.generate({ model, system, prompt, schema, signal? })
// Promise<ProviderResult<unknown>>
ollama.listModels(signal?) // Promise<ProviderResult<string[]>>
```

`ProviderResult<T>` is `{ok:true,value:T}` or
`{ok:false,error:{code,message}}`. Safe codes distinguish configuration,
unsupported-model, timeout, cancelled, unauthorized, rate-limited, unavailable,
invalid-response and budget-exceeded. Upstream exception text and error bodies
are never returned. Clients import no other IfSoul implementation; the current
ModelProvider specification remains a distinct family. These callable text clients
do not implement the serialized specification as a wire transport.

Defaults are 45 seconds for the complete asynchronous request/body wait,
200,000 serialized request bytes, 100,000 response bytes and 2,000 output tokens.
Legacy configuration ceilings are 60 seconds, 1,000,000 request/response bytes and 4,096
output tokens. Explicit trusted ceilings, configured model context and safe usage
observations are described in [resource budgets](resource-budgets.md). Defaults
remain unchanged; bytes are not token context. Streaming response bodies are read with a running byte bound;
oversized bodies are cancelled. Redirects reject. Aborted or timed-out operations
return even if an injected transport/binding ignores its signal. Actual upstream
work or charges may continue. No retries or persistent token/cost budget exist.

## OpenAI

The client posts to the fixed `https://api.openai.com/v1/responses` endpoint with
`store:false`, non-streaming output, a bounded `max_output_tokens`, and strict
`text.format` JSON Schema. It parses only completed assistant `output_text`,
rejecting refusal, incomplete output and malformed JSON. Keys are confined to
Authorization headers and the client closure; model prompts and returned data
contain no credential field. Configuration, per-user key lifetime, authentication
and disclosure authorization belong to the server composition root.

The default is `gpt-4.1-mini`; the allowlist additionally includes `gpt-4.1` and
`gpt-4.1-mini-2025-04-14`. These are explicit choices, not a claim about the latest
or best model. Their documented Responses and Structured Outputs support was
checked against the official [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini),
[GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1) and
[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
documentation. Account/model availability remains provider-controlled.
`store:false` is a request option, not a general zero-retention assurance.

## Cloudflare Workers AI

The composition root injects
`invoke(model, payload, signal): Promise<unknown>` around the AI binding.
The client sends messages, bounded `max_tokens`, `stream:false` and
`response_format:{type:'json_schema',json_schema:schema}`. Both JSON-object and
JSON-string `response` values are parsed and then checked by runtime.

The default is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; the second allowed model
is `@cf/meta/llama-3.1-8b-instruct-fp8`. Current model pages expose these IDs and
`response_format`: [Llama 3.3 70B](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/)
and [Llama 3.1 8B FP8](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/).
Cloudflare's [JSON mode documentation](https://developers.cloudflare.com/workers-ai/features/json-mode/)
describes the request and explicitly warns that schema fulfillment can fail.
The old unquantized Llama 3.1 URL redirects to unavailable; the FP8 ID is used.
A binding timeout is bounded locally and does not promise that
inference was cancelled upstream.

## Ollama

The default endpoint is `http://127.0.0.1:11434`. Only explicitly configured HTTP
loopback origins (`127.0.0.1`, `::1`, or `localhost`) are admitted, without URL
credentials, path/query/hash or redirects. The client uses only documented
[GET /api/tags](https://docs.ollama.com/api/tags) and
[POST /api/chat](https://docs.ollama.com/api/chat). It discovers existing names,
requests `stream:false`, passes the content JSON Schema as `format`, and bounds
`options.num_predict`. It never installs/pulls a model or exposes a remote URL
choice to model output.

For the original `qwen3` family only, requests include `think:false` to obtain
the final answer within the bounded wait. Other model families receive no
thinking override. Ollama documents Qwen3's boolean switch in its
[thinking announcement](https://ollama.com/blog/thinking) and the
[current thinking API](https://docs.ollama.com/capabilities/thinking); named
reasoning levels and general capability probing are not implemented here.

Known cloud tags/remote metadata and common embedding families are excluded from
selectable names. `/api/tags` is not a full capability probe: an unfamiliar
embedding-only or incompatible model can still fail explicitly. This heuristic
does not replace the administrator's responsibility for the trusted local daemon
and model configuration. No model is silently substituted. A cloud Worker cannot
reach the user's loopback daemon; Ollama is enabled only by local composition.

## Shared service and generated content

`apps/runtime-host/src/service.ts` exports:

```ts
createLabService({ memory, controllerFor, now? }): LabService
createModelController({ client, model, now? }): AgentController
createScenarioController(now?): AgentController
```

`SCENARIO_MODEL` is `synthetic-v1`. Scenario is an explicit deterministic choice,
never the fallback after a real provider error. The service types are in
`service-types.ts`; `snapshot()` returns a safe `Result<LabSnapshot>` and
`run({operation:'plan'|'chat',requestId,provider,model,message?})` returns
`Promise<Result<LabRunResponse>>`. The snapshot contains the same persistent
character, bounded raw memories and recent runs. Each run retains provider/model,
request ID, operation, safe stages, selected memory IDs and a plan/chat/failure
result. A failed model run is represented as `run.status:'failed'` with
`result.type:'failure'`; precondition/storage/overlap errors use outer `ok:false`.

For plans the provider generates only `{tasks:[...]}`; for dialogue it generates
only `{content:string}`. A dynamic generation schema constrains advertised
intents/parameters; it is not a substitute normative validator. Trusted server
code stamps binding, request/cycle/revisions, IDs, creation and expiry. Runtime
then validates the whole document and semantics. Prompts receive only selected
memory/context, never keys or an unrestricted store. Untrusted text cannot grant
new host authority. Model factual correctness is not guaranteed by JSON schema.

Inference uses a compact evidence projection rather than replaying all raw
records. It preserves source memory ID, kind, session and relevant original
report status/summary/effects, proposal tasks, decisions and conversational
content. Host execution reports take priority; conversation is explicitly
identified as speech rather than proof of host outcomes. Old context reports and
duplicated laboratory-run/debug envelopes are omitted. At most 10 host reports,
4 proposal/decision records and 6 conversation records fit a shared 12,000-byte
evidence budget; omissions are disclosed by count. The current briefing is
separate from historical reports, and missing evidence requires uncertainty.
Durable original memory remains unchanged; this projection changes only model
input, not recorded history or authoritative outcomes.

Each plan request starts an explicitly fresh synthetic abstract ledger with two
uninspected beds and zero water. The host accepts supported inspection tasks,
rejects unavailable watering or dependencies, executes accepted tasks in dependency
order and records actual abstract outcomes. This is a synthetic simulation, not
locomotion, game AI, combat or pathfinding. Chat creates a separate live-channel
incoming-message request and records confirmed delivery to the laboratory
transcript. Planning never automatically requests speech.

Current UTC context/deadlines are created per request. One character and durable
history survive provider/model switches and normal SQLite restart. Service-level
immutable claims/results make repeated IDs reusable without another model call
or host operation, including when the original plan expiry has passed: this is
historical result inspection, not a newly executable proposal. Changed input
under an ID rejects. An unfinished claim requires explicit reconciliation after
failure/crash. Overlapping calls on one service instance reject; the server root
also serializes per store. Keep one active writer per character/store.

The snapshot is bounded to 200 recent events and 1,000,000 serialized bytes.
Recent runs appear through their durable laboratory-run events; older completed
IDs remain exactly addressable by the journal, without claiming a complete archive
listing. Unlike the earlier runtime-only transient trace, service run records
also durably retain exact selected memory IDs. Full derived-fact/export lineage,
archive migration, deletion propagation and token accounting remain unimplemented.

Provider tests use mocked fetch/bindings; service tests use actual runtime and
SQLite with mock-generated content, plus explicit scenario tests. They cover
request formatting, safe failures, byte/time/cancellation bounds, loopback/model
restrictions, provider switching, restart/replay, partial host acceptance,
dependency execution order, no invented watering, and unfinished claim conflicts.
Live credentials, inference quality, deployment/authentication and browser
verification are separate composition checks.

HTTP adapters use manual redirect handling and reject non-success responses.
They never follow a redirect with credentials. Workers does not support the
Fetch standard's `redirect: "error"` mode; see the
[Workers Request API](https://developers.cloudflare.com/workers/runtime-apis/request/).
