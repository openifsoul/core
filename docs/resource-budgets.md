# Trusted resource budgets

Resource limits are independent from permission, model capability and host
mechanics. They are experimental callable configuration, not changes to the
current schemas or the separately named ModelProvider specification.
Defaults remain compatible. A larger byte allowance never grants control or
means that those bytes fit a model's token context.

## Layers and defaults

| Layer                            | Default                       | Legacy configuration ceiling    |
| -------------------------------- | ----------------------------- | ------------------------------- |
| Provider complete wait           | 45,000 ms                     | 60,000 ms                       |
| Provider serialized HTTP request | 200,000 UTF-8 bytes           | 1,000,000 bytes                 |
| Provider HTTP response           | 100,000 bytes                 | 1,000,000 bytes                 |
| Provider generated output        | 2,000 tokens                  | 4,096 tokens                    |
| Runtime controller wait          | 1,000 ms                      | 60,000 ms                       |
| Runtime document                 | 65,536 serialized UTF-8 bytes | 1,000,000 bytes                 |
| Runtime selected memory          | 64 records / 65,536 bytes     | 1,000 records / 1,000,000 bytes |
| Runtime controller calls         | 20                            | 10,000                          |
| Runtime context age              | 86,400,000 ms                 | Finite positive safe integer    |

These are library defaults, not hosted quotas. An application can choose stricter
limits. SDK transport envelopes, App ingress, prompt packing, retained evidence
and model tokens have separate owners and limits. See the
[App policy guide](https://github.com/openifsoul/app/blob/main/docs/resource-budgets.md)
and [SDK guide](https://github.com/openifsoul/sdk/blob/main/docs/resource-budgets.md).

## Explicit operator ceilings

Existing provider `limits` and runtime `limits` specify requested budgets. Provider
`budgetPolicy.ceilings` and runtime `ceilings` are separate trusted operator
ceilings. Omitted ceiling fields retain the legacy ceilings above. Raising a
ceiling does not raise the requested value. Browser bodies, model output,
imported identities and quoted evidence cannot set either side.

```ts
const client = createOllamaProvider({
  limits: { timeoutMs: 120_000, maxRequestBytes: 2_000_000 },
  budgetPolicy: {
    ceilings: { timeoutMs: 120_000, maxRequestBytes: 2_000_000 },
    contexts: {
      "installed-model": {
        windowTokens: 16_384,
        source: "operator",
      },
    },
    onBudget: (report) => inspectSafeBudgetMetadata(report),
    onUsage: (usage) => inspectSafeUsageMetadata(usage),
  },
});
```

The callbacks above are host-owned examples, not built-in logging or a token/cost
ledger. They receive numeric budgets/model names, not credentials or prompts.
Observer failures cannot authorize or change inference. `resolveProviderLimits`
and `resolveRuntimeLimits` expose requested/effective values, operator and
implementation ceilings, and rejected configuration fields. Invalid/unknown
settings reject; an exceeded trusted ceiling does not silently become unlimited.

The current buffered JSON implementation supports at most 64 MiB for a single
serialized document/provider request/response. This is an implementation support
boundary, not a universal provider limit or a hardware measurement. A 1 GiB
request can be described as operator intent, but this implementation returns
`unsupported-policy` before fetch when it exceeds that boundary. Do not claim
1 GiB end-to-end support from configuration arithmetic or small tests. Buffered
serialization/parsing also requires additional copies and does not promise a
particular peak-memory footprint. A streamed/chunked large-document transport
needs its own implementation and contract. Timer waits additionally remain within
the JavaScript timer range, 2,147,483,647 ms.

## Token context and uncertainty

`budgetPolicy.contexts[model]` may declare `windowTokens`, optional
`modelMaxTokens`, and a source of `operator` or `provider`. An unknown model must
not be assigned invented hardware/context capability. Missing metadata is
reported as unknown; legacy finite byte/output budgets remain enforced.
An operator must explicitly configure a finite window when raising model input
or output beyond the legacy configuration ceilings. Without that declaration,
the increased model policy is unsupported before provider invocation. Metadata
can remain unknown while that finite bound is operator-declared.

For Ollama, `windowTokens` is sent as `options.num_ctx`; an architectural
`modelMaxTokens` declaration is a separate upper bound. A declared runtime window
above the model bound rejects. Other providers retain their own context control;
a local declaration does not change the provider's real ceiling. See
[Ollama context allocation](https://docs.ollama.com/context-length) and its
[chat API](https://docs.ollama.com/api/chat).

An optional `countInputTokens(input)` returns `{tokens, kind: "exact" | "estimate",
method?}`. Input plus the configured output allowance must fit the declared
window. A heuristic is labelled an estimate, never actual usage or a tokenizer.
Without a counter, token accounting remains unknown. Provider-side limits still
apply and may reject a request; a byte count cannot establish token adequacy.

`onUsage` exposes available provider-reported input/output tokens and Ollama
prefill/decode timing after a response. Missing metrics remain absent. A
nonstreaming timeout exposes no completed response metrics, so it cannot establish
whether loading, prefill or decoding caused the delay. OpenAI output limits cover
visible and non-visible generated tokens; leave completion headroom rather than
assuming all allowed tokens become visible text. See official
[token-counting guidance](https://developers.openai.com/api/docs/guides/token-counting).

## Cancellation and validation

Provider response reads check declared length and a cumulative stream byte count,
cancelling on overflow before parsing the complete body. Runtime rechecks
freshness, session identity and deadlines after asynchronous work. A larger wait
or document budget never bypasses current structural maxima, scope, permission,
CAS/history validation or confirmed host outcomes.

Incomplete/truncated structured output is rejected. Lowering an output cap can
truncate a response; it does not guarantee faster valid completion. No automatic
retry, model download, hardware detection, paid-output increase or remote quota
change is performed.
