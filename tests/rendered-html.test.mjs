import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the fleet product instead of the starter preview", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);
  assert.match(page, /MVP connecté/);
  assert.match(page, /Contrôle hebdomadaire/);
  assert.match(page, /\/api\/weekly-controls/);
  assert.match(layout, /Flotte/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});

test("declares durable database and photo storage", async () => {
  const [hosting, schema, migration] = await Promise.all([
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0000_lame_surge.sql", root), "utf8"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "PHOTOS"/);
  for (const table of ["users", "vehicles", "weekly_controls", "issues", "operations", "photos"]) {
    assert.match(schema, new RegExp(`["]${table}["]`));
    assert.ok(migration.includes(`CREATE TABLE \`${table}\``));
  }
});

test("keeps all write workflows connected to server routes", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  for (const endpoint of ["/api/login", "/api/state", "/api/mileage", "/api/issues", "/api/weekly-controls", "/api/operations/complete", "/api/vehicles/status"]) {
    assert.match(page, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
});
