/** Supported buffered JSON implementation, not a model context or hardware claim.
 * Larger messages require a separately implemented streaming/chunk transport. */
export const BUFFERED_JSON_MAX_BYTES = 64 * 1024 * 1024;
export const MAX_TIMER_MS = 2_147_483_647;

export interface BudgetReport<T> {
  layer: string;
  status: "accepted" | "invalid" | "exceeded" | "unsupported";
  requested: T;
  effective: T;
  operatorCeilings: T;
  implementationCeilings: Partial<T>;
  failure?: {
    field: string;
    reason: string;
    requested?: number;
    limit?: number;
  };
}

/** Pure trusted-configuration resolver. Raising a ceiling never raises a request.
 * Unknown keys and non-finite/unbounded values reject instead of being ignored. */
export function resolveResourceLimits<T extends object>(options: {
  layer: string;
  defaults: T;
  legacyCeilings: T;
  requested?: Partial<T>;
  ceilings?: Partial<T>;
  implementationCeilings?: Partial<T>;
}): BudgetReport<T> {
  const requested = { ...options.defaults, ...options.requested };
  const ceilings = { ...options.legacyCeilings, ...options.ceilings };
  const effective = { ...requested };
  const implementation: Partial<T> = options.implementationCeilings ?? {};
  const report: BudgetReport<T> = {
    layer: options.layer,
    status: "accepted",
    requested,
    effective,
    operatorCeilings: ceilings,
    implementationCeilings: { ...implementation },
  };
  const failure = (
    status: BudgetReport<T>["status"],
    field: string,
    reason: string,
    value?: number,
    limit?: number,
  ) => {
    report.status = status;
    report.failure = {
      field,
      reason,
      ...(value === undefined ? {} : { requested: value }),
      ...(limit === undefined ? {} : { limit }),
    };
    return report;
  };
  for (const key of [
    ...Object.keys(options.requested ?? {}),
    ...Object.keys(options.ceilings ?? {}),
  ]) {
    if (!Object.hasOwn(options.defaults, key))
      return failure("invalid", key, "unknown-budget-field");
  }
  for (const key of Object.keys(options.defaults) as (keyof T)[]) {
    const value = requested[key] as number;
    const ceiling = ceilings[key] as number;
    const supported = (implementation[key] ??
      Number.MAX_SAFE_INTEGER) as number;
    if (
      ![value, ceiling, supported].every(
        (v) => Number.isSafeInteger(v) && v > 0,
      )
    )
      return failure("invalid", String(key), "positive-safe-integer-required");
    effective[key] = Math.min(value, ceiling, supported) as T[keyof T];
    if (value > supported)
      return failure(
        "unsupported",
        String(key),
        "buffered-implementation-limit",
        value,
        supported,
      );
    if (value > ceiling)
      return failure(
        "exceeded",
        String(key),
        "operator-ceiling",
        value,
        ceiling,
      );
  }
  return report;
}
