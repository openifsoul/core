import { verifyToken } from "@clerk/backend";
import { secured } from "./security.js";
export interface CloudAuthConfig {
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_JWT_KEY?: string;
  CLERK_ISSUER?: string;
  APP_ORIGIN?: string;
}
export interface AppPrincipal {
  id: string;
}
export function configuredCloudAuth(config: CloudAuthConfig): boolean {
  try {
    return (
      !!config.CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
      !!config.CLERK_JWT_KEY &&
      !!config.CLERK_ISSUER &&
      new URL(config.CLERK_ISSUER).protocol === "https:" &&
      new URL(config.APP_ORIGIN!).origin === config.APP_ORIGIN &&
      (new URL(config.APP_ORIGIN!).protocol === "https:" ||
        (new URL(config.APP_ORIGIN!).protocol === "http:" &&
          ["127.0.0.1", "localhost", "[::1]"].includes(
            new URL(config.APP_ORIGIN!).hostname,
          )))
    );
  } catch {
    return false;
  }
}
/** Only a verified Clerk session JWT establishes a cloud storage identity. */
export async function verifyCloudPrincipal(
  request: Request,
  config: CloudAuthConfig,
): Promise<AppPrincipal | undefined> {
  if (!configuredCloudAuth(config)) return;
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
  if (!token || token.length > 8192) return;
  try {
    const claims = await verifyToken(token, {
      jwtKey: config.CLERK_JWT_KEY,
      issuer: config.CLERK_ISSUER,
      authorizedParties: [config.APP_ORIGIN!],
      clockSkewInMs: 0,
    });
    if (
      typeof claims.sub !== "string" ||
      !/^user_[A-Za-z0-9_-]{1,120}$/.test(claims.sub) ||
      typeof claims.sid !== "string" ||
      !claims.sid ||
      claims.azp !== config.APP_ORIGIN ||
      typeof claims.exp !== "number" ||
      claims.exp * 1000 <= Date.now() ||
      (claims.sts !== undefined && claims.sts !== "active")
    )
      return;
    return { id: claims.sub };
  } catch {
    return;
  }
}
/** Loopback has no remote identity service; browser-origin checks protect reads too. */
export function trustedLocalRequest(
  request: Request,
  expectedOrigin: string,
): boolean {
  const url = new URL(request.url);
  const expected = new URL(expectedOrigin);
  if (
    expected.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(expected.hostname) ||
    url.origin !== expected.origin
  )
    return false;
  const host = request.headers.get("host");
  if (host !== expected.host) return false;
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== expected.origin) return false;
  if (!["GET", "HEAD"].includes(request.method) && origin !== expected.origin)
    return false;
  const site = request.headers.get("sec-fetch-site");
  return site === null || ["same-origin", "none"].includes(site);
}
export function appConfig(
  mode: "local" | "cloud",
  config: CloudAuthConfig = {},
) {
  return {
    mode,
    auth: mode === "local" ? "local" : "clerk",
    ...(mode === "cloud" && config.CLERK_PUBLISHABLE_KEY
      ? { clerkPublishableKey: config.CLERK_PUBLISHABLE_KEY }
      : {}),
    laboratory: mode === "local",
  };
}
/** Tested router dependency boundary; handlers are selected only from verified subjects. */
export function createCloudRouter(options: {
  config: CloudAuthConfig;
  user: (principal: AppPrincipal, request: Request) => Promise<Response>;
  demo: (request: Request) => Promise<Response>;
  assets: (request: Request) => Promise<Response>;
  authenticate?: (request: Request) => Promise<AppPrincipal | undefined>;
}) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/api/config" && request.method === "GET")
      return secured(Response.json(appConfig("cloud", options.config)));
    if (!path.startsWith("/api/")) return options.assets(request);
    if (!configuredCloudAuth(options.config))
      return secured(
        Response.json(
          {
            ok: false,
            error: {
              code: "not-configured",
              message: "Cloud sign-in is not configured.",
            },
          },
          { status: 503 },
        ),
      );
    if (
      url.origin !== options.config.APP_ORIGIN ||
      (request.headers.has("origin") &&
        request.headers.get("origin") !== url.origin) ||
      (!["GET", "HEAD"].includes(request.method) &&
        request.headers.get("origin") !== url.origin)
    )
      return secured(new Response(null, { status: 403 }));
    if (
      path.startsWith("/api/lab/") ||
      path === "/api/run" ||
      path === "/api/login" ||
      path === "/api/logout"
    )
      return secured(new Response(null, { status: 403 }));
    const principal = await (
      options.authenticate ??
      ((req) => verifyCloudPrincipal(req, options.config))
    )(request);
    if (!principal)
      return secured(
        Response.json(
          {
            ok: false,
            error: { code: "unauthorized", message: "Sign in to continue." },
          },
          { status: 401 },
        ),
      );
    return secured(
      path.startsWith("/api/demo/")
        ? await options.demo(request)
        : await options.user(principal, request),
    );
  };
}
