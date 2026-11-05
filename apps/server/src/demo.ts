import {
  BRIDGE_VERSION,
  validBridgeRequest,
  scenarioResponse,
} from "../../../packages/adapter-sdk/src/index.js";
import { runDemoRequest } from "../../runtime-host/src/demo-runtime.js";
import type { ModelClient } from "../../../packages/model-providers/src/types.js";
import type { PrivateStore } from "./api.js";
import { boundedJSON } from "./security.js";

export const DEMO_LIMITS = {
  userCalls: 30,
  globalCalls: 200,
  userTokens: 360000,
  globalTokens: 1200000,
  reservedTokens: 24000,
  outputTokens: 384,
} as const;
export interface DemoPrincipal {
  id: string;
}
interface Usage {
  calls: number;
  tokens: number;
}
interface Ledger {
  day: string;
  global: Usage;
  users: Record<string, Usage>;
  claims: string[];
}
class BudgetError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
const digest = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
const error = (code: string, status = 400) =>
  Response.json(
    {
      ok: false,
      error: {
        code,
        message: "Demo request unavailable. Continue in scenario mode.",
      },
    },
    { status },
  );
const validUsage = (value: unknown): value is Usage =>
  !!value &&
  typeof value === "object" &&
  ["calls", "tokens"].every(
    (key) =>
      Number.isSafeInteger((value as Record<string, number>)[key]) &&
      (value as Record<string, number>)[key] >= 0,
  );

/** Construct once in the globally shared single-writer owner, never per-user storage.
 * A single atomic store write commits the whole reservation before any paid call.
 * Failure retains that reservation; malformed or unavailable storage fails closed.
 */
export function createPaidBudgetGate(options: {
  store: PrivateStore;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  let busy = false;
  function read(): Ledger {
    const day = new Date(now()).toISOString().slice(0, 10);
    const raw = options.store.get("demo-budget-v2");
    if (raw === undefined) {
      // Preserve owner-paid usage from the retired invitation implementation.
      const legacyRaw = options.store.get("demo-global");
      let global: Usage = { calls: 0, tokens: 0 };
      if (legacyRaw !== undefined) {
        const legacy = JSON.parse(legacyRaw) as Usage & { day: string };
        if (
          !validUsage(legacy) ||
          typeof legacy.day !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(legacy.day) ||
          legacy.day > day
        )
          throw Error("Invalid legacy budget");
        if (legacy.day === day)
          global = { calls: legacy.calls, tokens: legacy.tokens };
      }
      return { day, global, users: {}, claims: [] };
    }
    const ledger: unknown = JSON.parse(raw);
    if (!ledger || typeof ledger !== "object")
      throw Error("Invalid budget ledger");
    const data = ledger as Ledger;
    if (
      typeof data.day !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.day) ||
      !validUsage(data.global) ||
      !data.users ||
      typeof data.users !== "object" ||
      Array.isArray(data.users) ||
      !Object.values(data.users).every(validUsage) ||
      !Array.isArray(data.claims) ||
      !data.claims.every((c) => typeof c === "string") ||
      data.claims.length > DEMO_LIMITS.globalCalls
    )
      throw Error("Invalid budget ledger");
    if (data.day > day) throw Error("Budget clock moved backwards");
    return data.day === day
      ? data
      : { day, global: { calls: 0, tokens: 0 }, users: {}, claims: [] };
  }
  const remaining = (ledger: Ledger, user: string) => {
    const used = ledger.users[user] ?? { calls: 0, tokens: 0 };
    return Math.max(
      0,
      Math.min(
        DEMO_LIMITS.userCalls - used.calls,
        DEMO_LIMITS.globalCalls - ledger.global.calls,
        Math.floor(
          (DEMO_LIMITS.userTokens - used.tokens) / DEMO_LIMITS.reservedTokens,
        ),
        Math.floor(
          (DEMO_LIMITS.globalTokens - ledger.global.tokens) /
            DEMO_LIMITS.reservedTokens,
        ),
      ),
    );
  };
  function reserve(user: string, requestId: string) {
    if (
      !/^[a-f0-9]{64}$/.test(user) ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(requestId)
    )
      throw new BudgetError("invalid-document", 400);
    const ledger = read(),
      claim = `${user}:${requestId}`;
    if (ledger.claims.includes(claim)) throw new BudgetError("conflict", 409);
    if (remaining(ledger, user) < 1)
      throw new BudgetError("budget-exceeded", 429);
    const usage = ledger.users[user] ?? { calls: 0, tokens: 0 };
    usage.calls++;
    usage.tokens += DEMO_LIMITS.reservedTokens;
    ledger.users[user] = usage;
    ledger.global.calls++;
    ledger.global.tokens += DEMO_LIMITS.reservedTokens;
    ledger.claims.push(claim);
    options.store.set("demo-budget-v2", JSON.stringify(ledger));
  }
  return {
    async reservePaid(
      principalId: string,
      requestId: string,
    ): Promise<{ ok: boolean; code?: string }> {
      try {
        if (!principalId || principalId.length > 256)
          return { ok: false, code: "unauthorized" };
        reserve(await digest(principalId), requestId);
        return { ok: true };
      } catch (cause) {
        return {
          ok: false,
          code: cause instanceof BudgetError ? cause.code : "unavailable",
        };
      }
    },
    remaining(user: string) {
      return remaining(read(), user);
    },
    async run<T>(
      user: string,
      requestId: string,
      operation: () => Promise<T>,
    ): Promise<T> {
      if (busy) throw new BudgetError("busy", 409);
      busy = true;
      try {
        reserve(user, requestId);
        return await operation();
      } finally {
        busy = false;
      }
    },
  };
}
export function createDemoAPI(options: {
  store: PrivateStore;
  authenticate: (request: Request) => Promise<DemoPrincipal | undefined>;
  client?: () => Promise<{ client: ModelClient; model: string }>;
  now?: () => number;
  budget?: ReturnType<typeof createPaidBudgetGate>;
}) {
  const budget = options.budget ?? createPaidBudgetGate(options);
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url),
        path = url.pathname;
      if (
        !["GET", "HEAD"].includes(request.method) &&
        request.headers.get("origin") !== url.origin
      )
        return error("forbidden", 403);
      if (path !== "/api/demo/status" && path !== "/api/demo/bridge")
        return error("not-found", 404);
      const principal = await options.authenticate(request);
      const trusted =
        principal &&
        typeof principal.id === "string" &&
        principal.id.length > 0 &&
        principal.id.length <= 256
          ? principal
          : undefined;
      const user = trusted ? await digest(trusted.id) : undefined;
      if (path === "/api/demo/status" && request.method === "GET")
        return Response.json({
          version: BRIDGE_VERSION,
          available: !!options.client,
          authenticated: !!user,
          remaining: user ? budget.remaining(user) : 0,
        });
      if (path !== "/api/demo/bridge" || request.method !== "POST")
        return error("not-found", 404);
      if (!user) return error("unauthorized", 401);
      if (!options.client) return error("unavailable", 503);
      const body = await boundedJSON(request, 8192);
      if (!validBridgeRequest(body)) return error("invalid-document");
      // Recheck trusted authentication after the potentially delayed body read.
      const current = await options.authenticate(request);
      if (current?.id !== trusted?.id) return error("unauthorized", 401);
      return await budget.run(user, body.requestId, async () => {
        try {
          const selection = await options.client!();
          return Response.json(
            await runDemoRequest(body, selection.client, selection.model),
          );
        } catch {
          return Response.json(scenarioResponse(body, "fallback"));
        }
      });
    } catch (cause) {
      return cause instanceof BudgetError
        ? error(cause.code, cause.status)
        : error("unavailable", 503);
    }
  };
}
