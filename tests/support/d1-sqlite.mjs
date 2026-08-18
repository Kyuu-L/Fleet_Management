// A minimal D1Database-compatible wrapper around Node's built-in node:sqlite,
// used so API integration tests exercise real SQL (D1 is SQLite) without
// needing a live Workers runtime.
import { DatabaseSync } from "node:sqlite";

function wrapStatement(raw, sql, args) {
  return {
    bind(...nextArgs) {
      return wrapStatement(raw, sql, nextArgs);
    },
    async first() {
      return raw.prepare(sql).get(...args) ?? null;
    },
    async run() {
      const info = raw.prepare(sql).run(...args);
      return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
    },
    async all() {
      return { success: true, results: raw.prepare(sql).all(...args) };
    },
  };
}

export function createTestD1() {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON");
  return {
    prepare(sql) {
      return wrapStatement(raw, sql, []);
    },
    async batch(statements) {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  };
}
