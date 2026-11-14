import type { DatabaseSync } from "node:sqlite";

/** External-content index, with canonical event documents as the sole source. */
export function initializeEventSearch(database: DatabaseSync): boolean {
  database.exec("BEGIN IMMEDIATE");
  try {
    const existing = database
      .prepare(
        "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='event_search_v1'",
      )
      .get();
    database.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS event_search_v1 USING fts5(
        document, content='events', content_rowid='sequence', tokenize='unicode61'
      );
      CREATE TABLE IF NOT EXISTS event_search_versions (version INTEGER PRIMARY KEY);
      CREATE TRIGGER IF NOT EXISTS event_search_v1_insert AFTER INSERT ON events BEGIN
        INSERT INTO event_search_v1(rowid, document) VALUES (new.sequence, new.document);
      END;
      CREATE TRIGGER IF NOT EXISTS event_search_v1_delete AFTER DELETE ON events BEGIN
        INSERT INTO event_search_v1(event_search_v1, rowid, document)
        VALUES ('delete', old.sequence, old.document);
      END;
      CREATE TRIGGER IF NOT EXISTS event_search_v1_update AFTER UPDATE ON events BEGIN
        INSERT INTO event_search_v1(event_search_v1, rowid, document)
        VALUES ('delete', old.sequence, old.document);
        INSERT INTO event_search_v1(rowid, document) VALUES (new.sequence, new.document);
      END;
    `);
    if (
      !existing ||
      !database
        .prepare("SELECT 1 FROM event_search_versions WHERE version=1")
        .get()
    ) {
      database.exec(`
        INSERT INTO event_search_v1(event_search_v1) VALUES ('rebuild');
        INSERT OR REPLACE INTO event_search_versions(version) VALUES (1);
      `);
    }
    database.exec("COMMIT");
    return true;
  } catch (error) {
    database.exec("ROLLBACK");
    if (error instanceof Error && error.message === "no such module: fts5")
      return false;
    throw error;
  }
}
