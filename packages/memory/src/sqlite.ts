import { DatabaseSync } from "node:sqlite";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeSync,
  chmodSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { failure, success } from "./port.js";
import type { MemoryPort, Result } from "./port.js";
import { createSQLMemory, MEMORY_SCHEMA } from "./sql.js";
import { initializeEventSearch } from "./sqlite-search.js";
export { validScope } from "./sql.js";

/** Opens one locally owned SQLite writer. Never removes an existing ownership lock. */
export function openSQLiteMemory(filename: string): Result<MemoryPort> {
  let database: DatabaseSync | undefined;
  let lockPath: string | undefined;
  let lockFd: number | undefined;
  const release = () => {
    if (lockFd !== undefined) {
      closeSync(lockFd);
      lockFd = undefined;
    }
    if (lockPath) {
      unlinkSync(lockPath);
      lockPath = undefined;
    }
  };
  try {
    let path = filename;
    if (path !== ":memory:") {
      const absolute = resolve(path);
      mkdirSync(dirname(absolute), { recursive: true, mode: 0o700 });
      path = existsSync(absolute)
        ? realpathSync(absolute)
        : join(realpathSync(dirname(absolute)), basename(absolute));
      if (existsSync(path) && statSync(path).nlink !== 1)
        return failure(
          "storage",
          "Hard-linked database files are unsupported.",
        );
      const candidate = `${path}.lock`;
      try {
        lockFd = openSync(candidate, "wx", 0o600);
      } catch (error) {
        if ((error as { code?: string }).code === "EEXIST")
          return failure(
            "database-owned",
            "Database ownership lock exists; verify its owner before manual recovery.",
          );
        throw error;
      }
      lockPath = candidate;
      writeSync(
        lockFd,
        JSON.stringify({
          pid: process.pid,
          createdAt: new Date().toISOString(),
        }),
      );
    }
    database = new DatabaseSync(path);
    if (path !== ":memory:") chmodSync(path, 0o600);
    database.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE;");
    database.exec(MEMORY_SCHEMA);
    database.exec(
      "CREATE INDEX IF NOT EXISTS event_owner_sequence ON events(character_id, sequence)",
    );
    const indexedSearch = initializeEventSearch(database);
    const db = database;
    let closed = false;
    return success(
      createSQLMemory(
        {
          prepare: (sql) => db.prepare(sql),
          transaction: (work) => {
            db.exec("BEGIN IMMEDIATE");
            try {
              const result = work();
              db.exec("COMMIT");
              return result;
            } catch (error) {
              db.exec("ROLLBACK");
              throw error;
            }
          },
        },
        () => {
          if (!closed) {
            db.close();
            closed = true;
          }
          release();
        },
        { indexedSearch },
      ),
    );
  } catch {
    let connectionClosed = true;
    try {
      database?.close();
    } catch {
      connectionClosed = false;
    }
    if (connectionClosed)
      try {
        release();
      } catch {
        /* manual recovery may be required */
      }
    return failure("storage", "Unable to open local memory store.");
  }
}
