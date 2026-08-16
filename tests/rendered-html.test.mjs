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
  for (const endpoint of ["/api/login", "/api/state", "/api/mileage", "/api/issues", "/api/weekly-controls", "/api/operations/complete", "/api/vehicles/status", "/api/vehicles", "/api/users", "/api/maintenance-plans"]) {
    assert.match(page, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
});

test("restricts fleet and team administration to the chef role", async () => {
  const [vehiclesRoute, vehicleIdRoute, usersRoute, userIdRoute] = await Promise.all([
    readFile(new URL("app/api/vehicles/route.ts", root), "utf8"),
    readFile(new URL("app/api/vehicles/[id]/route.ts", root), "utf8"),
    readFile(new URL("app/api/users/route.ts", root), "utf8"),
    readFile(new URL("app/api/users/[id]/route.ts", root), "utf8"),
  ]);
  for (const source of [vehiclesRoute, vehicleIdRoute, usersRoute, userIdRoute]) {
    assert.match(source, /isChef\(user\.role\)/);
  }
});

test("keeps future maintenance scheduled without treating it as current work", async () => {
  const [page, maintenance] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("lib/maintenance.ts", root), "utf8"),
  ]);
  assert.match(page, /selectedActionableOperations/);
  assert.match(page, /actionableMaintenance/);
  assert.match(maintenance, /maintenanceLeadKm = 3000/);
  assert.match(maintenance, /maintenanceLeadDays = 30/);
});

test("connects vehicle filters and vehicle-level issue closure", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /setVehicleFilter\("available"\)/);
  assert.match(page, /setVehicleFilter\("hs"\)/);
  assert.match(page, /selectedPendingIssues/);
  assert.match(page, /pending-issue-/);
  assert.match(page, />Clôturer</);
});

test("builds recent activity from every fleet workflow", async () => {
  const state = await readFile(new URL("lib/server/state.ts", root), "utf8");
  for (const kind of ["issue", "mileage", "weekly", "operation"]) {
    assert.match(state, new RegExp(`${kind}:`));
  }
  assert.match(state, /mileage_logs/);
  assert.match(state, /weekly_controls/);
  assert.match(state, /Opération atelier réalisée/);
  assert.match(state, /LIMIT 25/);
});

test("computes maintenance labels and weekly history from server state", async () => {
  const [state, page] = await Promise.all([
    readFile(new URL("lib/server/state.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);
  assert.match(state, /computeMaintenanceLabel/);
  assert.match(state, /vehicleWeeklyHistory/);
  assert.match(state, /weekLabel/);
  assert.match(state, /todayLabel/);
  assert.match(page, /vehicleWeeklyHistory/);
  assert.match(page, /weekLabel/);
  assert.doesNotMatch(page, /issueSeed|operationsSeed|weeklyChecksSeed/);
});

test("restricts scheduled operation creation to workshop roles", async () => {
  const operationsRoute = await readFile(new URL("app/api/operations/route.ts", root), "utf8");
  assert.match(operationsRoute, /canManageWorkshop\(user\.role\)/);
});

test("authenticates users by role and pin instead of the first account per role", async () => {
  const [auth, usersRoute, userIdRoute] = await Promise.all([
    readFile(new URL("lib/server/auth.ts", root), "utf8"),
    readFile(new URL("app/api/users/route.ts", root), "utf8"),
    readFile(new URL("app/api/users/[id]/route.ts", root), "utf8"),
  ]);
  assert.match(auth, /pin_hash = \?/);
  assert.doesNotMatch(auth, /LIMIT 1\)\.bind\(role\)/);
  assert.match(usersRoute, /pin_hash = \?/);
  assert.match(userIdRoute, /DELETE FROM sessions WHERE user_id = \?/);
  assert.match(userIdRoute, /login_enabled = 1/);
});
