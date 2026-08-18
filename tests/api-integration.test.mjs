// Integration tests for the API routes: real SQL (node:sqlite standing in
// for D1), real Request/Response objects, real route handlers — only the
// Workers-only "cloudflare:workers" binding is mocked. Each test gets a
// fresh in-memory database via beforeEach, so tests don't leak state.
import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach } from "node:test";

register("./support/resolve-hook.mjs", import.meta.url);

const { env } = await import("./support/mock-cloudflare-workers.mjs");
const { createTestD1 } = await import("./support/d1-sqlite.mjs");
const { ensureSchema } = await import("../lib/server/schema-sql.ts");
const { hashPin } = await import("../lib/server/auth.ts");

const loginRoute = await import("../app/api/login/route.ts");
const sessionRoute = await import("../app/api/session/route.ts");
const vehiclesRoute = await import("../app/api/vehicles/route.ts");
const vehicleByIdRoute = await import("../app/api/vehicles/[id]/route.ts");
const mileageRoute = await import("../app/api/mileage/route.ts");
const operationsCompleteRoute = await import("../app/api/operations/complete/route.ts");

const PINS = { salarie: "1111", mecano: "2222", chef: "3333" };

beforeEach(async () => {
  const db = createTestD1();
  await ensureSchema(db);
  env.DB = db;

  for (const [id, name, initials, role] of [
    [1, "Lucas Martin", "LM", "salarie"],
    [2, "Thomas Bernard", "TB", "mecano"],
    [3, "Alice Dubois", "AD", "chef"],
  ]) {
    const pinHash = await hashPin(PINS[role]);
    await db.prepare("INSERT INTO users (id, name, initials, role, pin_hash, login_enabled, active) VALUES (?, ?, ?, ?, ?, 1, 1)")
      .bind(id, name, initials, role, pinHash).run();
  }
  await db.prepare("INSERT INTO vehicles (id, plate, label, model_id, km, status, maintenance, image) VALUES (1, 'AA-111-AA', 'Renault Master III L2H2 2022', 'master-3-l2h2', 50000, 'Disponible', 'À jour', '/vehicles/master-3-l2h2.webp')").run();
});

function jsonRequest(url, method, body) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function extractCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "expected a Set-Cookie header");
  return setCookie.split(";")[0];
}

async function loginAs(role) {
  const response = await loginRoute.POST(jsonRequest("http://test/api/login", "POST", { role, pin: PINS[role] }));
  assert.equal(response.status, 200);
  return extractCookie(response);
}

function withCookie(url, method, body, cookie) {
  const request = jsonRequest(url, method, body);
  if (cookie) request.headers.set("Cookie", cookie);
  return request;
}

test("login rejects a malformed pin before touching the database", async () => {
  const response = await loginRoute.POST(jsonRequest("http://test/api/login", "POST", { role: "salarie", pin: "12" }));
  assert.equal(response.status, 400);
});

test("login rejects the wrong pin for a role", async () => {
  const response = await loginRoute.POST(jsonRequest("http://test/api/login", "POST", { role: "salarie", pin: "9999" }));
  assert.equal(response.status, 401);
});

test("login issues a session cookie on a correct pin", async () => {
  const response = await loginRoute.POST(jsonRequest("http://test/api/login", "POST", { role: "chef", pin: PINS.chef }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.role, "chef");
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/);
});

test("session cookie authenticates and DELETE /api/session revokes it", async () => {
  const cookie = await loginAs("salarie");
  const authed = await sessionRoute.GET(withCookie("http://test/api/session", "GET", undefined, cookie));
  assert.equal((await authed.json()).user.role, "salarie");

  const logout = await sessionRoute.DELETE(withCookie("http://test/api/session", "DELETE", undefined, cookie));
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/);

  const afterLogout = await sessionRoute.GET(withCookie("http://test/api/session", "GET", undefined, cookie));
  assert.equal((await afterLogout.json()).user, null);
});

test("creating a vehicle requires authentication", async () => {
  const response = await vehiclesRoute.POST(jsonRequest("http://test/api/vehicles", "POST", { plate: "BB-222-BB", modelId: "master-3-l2h2", km: 0 }));
  assert.equal(response.status, 401);
});

test("creating a vehicle is restricted to the chef role", async () => {
  const salarieCookie = await loginAs("salarie");
  const denied = await vehiclesRoute.POST(withCookie("http://test/api/vehicles", "POST", { plate: "BB-222-BB", modelId: "master-3-l2h2", km: 0 }, salarieCookie));
  assert.equal(denied.status, 403);

  const chefCookie = await loginAs("chef");
  const created = await vehiclesRoute.POST(withCookie("http://test/api/vehicles", "POST", { plate: "BB-222-BB", modelId: "master-3-l2h2", km: 0 }, chefCookie));
  assert.equal(created.status, 201);

  const duplicate = await vehiclesRoute.POST(withCookie("http://test/api/vehicles", "POST", { plate: "BB-222-BB", modelId: "master-3-l2h2", km: 0 }, chefCookie));
  assert.equal(duplicate.status, 400);
});

test("deleting a vehicle is restricted to the chef role", async () => {
  const mecanoCookie = await loginAs("mecano");
  const denied = await vehicleByIdRoute.DELETE(withCookie("http://test/api/vehicles/1", "DELETE", undefined, mecanoCookie));
  assert.equal(denied.status, 403);

  const chefCookie = await loginAs("chef");
  const deleted = await vehicleByIdRoute.DELETE(withCookie("http://test/api/vehicles/1", "DELETE", undefined, chefCookie));
  assert.equal(deleted.status, 200);

  const missing = await vehicleByIdRoute.DELETE(withCookie("http://test/api/vehicles/1", "DELETE", undefined, chefCookie));
  assert.equal(missing.status, 404);
});

test("mileage cannot regress and updates the vehicle on success", async () => {
  const cookie = await loginAs("salarie");

  const regressed = await mileageRoute.POST(withCookie("http://test/api/mileage", "POST", { vehicleId: 1, mileage: 40000 }, cookie));
  assert.equal(regressed.status, 400);

  const accepted = await mileageRoute.POST(withCookie("http://test/api/mileage", "POST", { vehicleId: 1, mileage: 51000 }, cookie));
  assert.equal(accepted.status, 200);

  const db = env.DB;
  const vehicle = await db.prepare("SELECT km FROM vehicles WHERE id = ?").bind(1).first();
  assert.equal(vehicle.km, 51000);
  const log = await db.prepare("SELECT source FROM mileage_logs WHERE vehicle_id = ?").bind(1).first();
  assert.equal(log.source, "manual");
});

test("completing workshop operations is restricted to mecano/chef and updates vehicle km", async () => {
  const salarieCookie = await loginAs("salarie");
  const denied = await operationsCompleteRoute.POST(withCookie("http://test/api/operations/complete", "POST", {
    kind: "new", vehicleId: 1, title: "Vidange", mileage: 52000,
  }, salarieCookie));
  assert.equal(denied.status, 403);

  const mecanoCookie = await loginAs("mecano");
  const completed = await operationsCompleteRoute.POST(withCookie("http://test/api/operations/complete", "POST", {
    kind: "new", vehicleId: 1, title: "Vidange", mileage: 52000,
  }, mecanoCookie));
  assert.equal(completed.status, 200);

  const db = env.DB;
  const vehicle = await db.prepare("SELECT km FROM vehicles WHERE id = ?").bind(1).first();
  assert.equal(vehicle.km, 52000);
  const operation = await db.prepare("SELECT status, completed_by FROM operations WHERE vehicle_id = ? AND status = 'done'").bind(1).first();
  assert.equal(operation.completed_by, "Thomas Bernard");
});
