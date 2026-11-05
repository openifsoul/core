import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createServer } from "node:net";
import { spawn } from "node:child_process";

/** Opt-in real workerd/SQLite test. Uses only synthetic keys and scenario inference. */
test(
  "real local Worker isolates Clerk subjects, chat memory, exports and encrypted keys",
  { skip: process.env.IFSOUL_WORKER_TEST !== "1", timeout: 60000 },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "ifsoul-worker-isolation-"));
    const root = resolve(import.meta.dirname, "../..");
    const listener = createServer();
    await new Promise<void>((done) => listener.listen(0, "127.0.0.1", done));
    const address = listener.address();
    assert.ok(address && typeof address === "object");
    const port = address.port;
    await new Promise<void>((done) => listener.close(() => done()));
    const origin = `http://127.0.0.1:${port}`;
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const config = JSON.parse(
      readFileSync(join(root, "wrangler.jsonc"), "utf8").replace(
        /,\s*([}\]])/g,
        "$1",
      ),
    );
    delete config.$schema;
    delete config.ai;
    config.main = join(root, "apps/server/src/worker.ts");
    config.assets.directory = join(directory, "assets");
    config.vars = {
      APP_ORIGIN: origin,
      CLERK_PUBLISHABLE_KEY: "pk_test_synthetic",
      CLERK_JWT_KEY: publicKey
        .export({ type: "spki", format: "pem" })
        .toString(),
      CLERK_ISSUER: "https://synthetic.clerk.accounts.dev",
      ENCRYPTION_KEY: "only-a-synthetic-worker-test-key",
    };
    const { mkdirSync } = await import("node:fs");
    mkdirSync(config.assets.directory);
    writeFileSync(
      join(config.assets.directory, "index.html"),
      "<!doctype html><title>Synthetic worker fixture</title>",
    );
    const configPath = join(directory, "wrangler.json");
    writeFileSync(configPath, JSON.stringify(config));
    const child = spawn(
      process.execPath,
      [
        join(root, "node_modules/wrangler/bin/wrangler.js"),
        "dev",
        "--config",
        configPath,
        "--local",
        "--ip",
        "127.0.0.1",
        "--port",
        String(port),
        "--inspector-port",
        "0",
        "--persist-to",
        join(directory, "state"),
        "--show-interactive-dev-session=false",
        "--log-level",
        "error",
      ],
      {
        cwd: root,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      },
    );
    let output = "";
    child.stdout.on("data", (data) => {
      output += String(data);
    });
    child.stderr.on("data", (data) => {
      output += String(data);
    });
    const sleep = (ms: number) =>
      new Promise<void>((done) => setTimeout(done, ms));
    function token(subject: string, expired = false) {
      const enc = (value: unknown) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
      const value = `${enc({ alg: "RS256", typ: "JWT", kid: "test" })}.${enc({ sub: subject, sid: "sess_synthetic", azp: origin, iss: config.vars.CLERK_ISSUER, iat: Math.floor(Date.now() / 1000) - 5, nbf: Math.floor(Date.now() / 1000) - 5, exp: expired ? 1 : Math.floor(Date.now() / 1000) + 120 })}`;
      return `${value}.${sign("RSA-SHA256", Buffer.from(value), privateKey).toString("base64url")}`;
    }
    async function request(
      path: string,
      subject = "user_one",
      method = "GET",
      body?: unknown,
    ) {
      return fetch(origin + path, {
        method,
        headers: {
          origin,
          authorization: `Bearer ${token(subject)}`,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    }
    try {
      let ready = false;
      for (let i = 0; i < 150; i++) {
        try {
          if ((await fetch(origin + "/api/config")).ok) {
            ready = true;
            break;
          }
        } catch {}
        if (child.exitCode !== null) break;
        await sleep(100);
      }
      assert.ok(
        ready,
        `Owned test Worker did not start: ${output.slice(-3000)}`,
      );
      const publicConfig = (await (
        await fetch(origin + "/api/config")
      ).json()) as { auth: string; laboratory: boolean };
      assert.equal(publicConfig.auth, "clerk");
      assert.equal(publicConfig.laboratory, false);
      assert.equal(JSON.stringify(publicConfig).includes("JWT_KEY"), false);
      assert.equal(
        (
          await fetch(origin + "/api/characters", {
            headers: { "x-user-id": "user_one" },
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await fetch(origin + "/api/characters", {
            headers: { authorization: `Bearer ${token("user_one", true)}` },
          })
        ).status,
        401,
      );
      const status = (await (await request("/api/status")).json()) as {
        providers: { id: string; available: boolean }[];
      };
      assert.equal(
        status.providers.find((p) => p.id === "cloudflare")?.available,
        false,
      );
      const demoStatus = (await (await request("/api/demo/status")).json()) as {
        available: boolean;
      };
      assert.equal(demoStatus.available, false);
      const created = await request("/api/characters", "user_one", "POST", {
        requestId: "create-a",
        name: "Only User One",
        description: "Original fixture.",
        speechStyle: "Brief.",
        biography: "Fictional.",
      });
      assert.equal(created.status, 200, await created.clone().text());
      const payload = (await created.json()) as {
        value: { character: { characterId: string } };
      };
      const characterId = payload.value.character.characterId as string;
      assert.equal(
        (
          await request("/api/credentials/openai", "user_one", "POST", {
            key: "synthetic-private-user-one-key",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          (await (await request("/api/status", "user_one")).json()) as {
            providers: { id: string; available: boolean }[];
          }
        ).providers.find((p: { id: string }) => p.id === "openai")!.available,
        true,
      );
      assert.equal(
        (
          (await (await request("/api/status", "user_two")).json()) as {
            providers: { id: string; available: boolean }[];
          }
        ).providers.find((p: { id: string }) => p.id === "openai")!.available,
        false,
      );
      const chat = await request("/api/chat", "user_one", "POST", {
        characterId,
        operation: "chat",
        provider: "scenario",
        model: "synthetic-v1",
        requestId: "chat-a",
        message: "Only user one said the synthetic violet password.",
      });
      assert.equal(chat.status, 200, await chat.clone().text());
      assert.match(
        await (
          await request(`/api/snapshot?characterId=${characterId}`, "user_one")
        ).text(),
        /synthetic violet password/,
      );
      assert.doesNotMatch(
        await (await request("/api/snapshot", "user_two")).text(),
        /synthetic violet password|Only User One/,
      );
      assert.equal(
        (
          await request(
            `/api/characters/export?characterId=${characterId}`,
            "user_two",
          )
        ).status,
        400,
      );
      assert.equal(
        (await request(`/api/snapshot?characterId=${characterId}`, "user_two"))
          .status,
        200,
      );
      assert.equal(
        (
          (await (
            await request(
              `/api/snapshot?characterId=${characterId}`,
              "user_two",
            )
          ).json()) as { ok: boolean }
        ).ok,
        false,
      );
      assert.equal(
        (await request("/api/lab/run", "user_one", "POST", {})).status,
        403,
      );
      assert.equal(
        (await request("/api/run", "user_one", "POST", {})).status,
        403,
      );
      assert.equal(
        (await request("/api/chat", "user_one", "POST", { operation: "plan" }))
          .status,
        403,
      );
      const asset = await fetch(origin + "/");
      assert.match(
        asset.headers.get("content-security-policy") ?? "",
        /https:\/\/synthetic\.clerk\.accounts\.dev/,
      );
    } finally {
      child.kill("SIGINT");
      await Promise.race([
        new Promise<void>((done) => child.once("close", () => done())),
        sleep(5000),
      ]);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await new Promise<void>((done) => child.once("close", () => done()));
      }
      rmSync(directory, { recursive: true, force: true });
      let open = false;
      try {
        await fetch(origin + "/api/config", {
          signal: AbortSignal.timeout(500),
        });
        open = true;
      } catch {}
      assert.equal(open, false, "Owned Worker listener must close");
    }
  },
);
