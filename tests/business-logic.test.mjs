import assert from "node:assert/strict";
import test from "node:test";

import { deriveIssueTitle } from "../lib/server/issue-title.ts";
import { parseMileagePayload, checkMileageNotRegressing } from "../lib/server/mileage.ts";
import { computeNextOperation } from "../lib/server/operations.ts";
import { isMaintenanceActionable } from "../lib/maintenance.ts";

test("deriveIssueTitle uses the first sentence, capped at 72 chars", () => {
  assert.equal(deriveIssueTitle("Bruit au freinage. Ca dure depuis hier.", "Freinage"), "Bruit au freinage");
});

test("deriveIssueTitle falls back to the category when there is no usable sentence", () => {
  assert.equal(deriveIssueTitle("...", "Freinage"), "Freinage");
});

test("deriveIssueTitle truncates very long first sentences to 72 characters", () => {
  const long = "a".repeat(120);
  assert.equal(deriveIssueTitle(long, "Autre"), long.slice(0, 72));
});

test("parseMileagePayload rejects non-integer or negative mileage", () => {
  assert.equal(parseMileagePayload(1, -5).ok, false);
  assert.equal(parseMileagePayload(1, 1.5).ok, false);
  assert.equal(parseMileagePayload("x", 100).ok, false);
});

test("parseMileagePayload accepts a valid integer mileage", () => {
  const result = parseMileagePayload("3", "82500");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.vehicleId, 3);
    assert.equal(result.mileage, 82500);
  }
});

test("checkMileageNotRegressing refuses a mileage lower than the last reading", () => {
  assert.equal(checkMileageNotRegressing(80000, 82000).ok, false);
});

test("checkMileageNotRegressing accepts equal or higher mileage", () => {
  assert.equal(checkMileageNotRegressing(82000, 82000).ok, true);
  assert.equal(checkMileageNotRegressing(82500, 82000).ok, true);
});

test("computeNextOperation returns null without recurrence", () => {
  const result = computeNextOperation({
    mileage: 85000,
    now: new Date("2026-08-16T00:00:00Z"),
    recurrenceKm: null,
    recurrenceMonths: null,
  });
  assert.equal(result, null);
});

test("computeNextOperation schedules the next km-based due point", () => {
  const result = computeNextOperation({
    mileage: 85000,
    now: new Date("2026-08-16T00:00:00Z"),
    recurrenceKm: 20000,
    recurrenceMonths: null,
  });
  assert.ok(result);
  assert.equal(result.dueKm, 105000);
  assert.equal(result.dueDate, null);
});

test("computeNextOperation schedules the next date-based due point", () => {
  const result = computeNextOperation({
    mileage: 85000,
    now: new Date("2026-08-16T00:00:00Z"),
    recurrenceKm: null,
    recurrenceMonths: 24,
  });
  assert.ok(result);
  assert.equal(result.dueDate, "2028-08-16");
  assert.equal(result.dueKm, null);
});

test("isMaintenanceActionable regression guard on the lead-time window", () => {
  const now = new Date("2026-08-16T00:00:00Z");
  assert.equal(isMaintenanceActionable({ done: false, dueKm: 87500 }, 85000, now), true);
  assert.equal(isMaintenanceActionable({ done: false, dueKm: 95000 }, 85000, now), false);
  assert.equal(isMaintenanceActionable({ done: true, dueKm: 85500 }, 85000, now), false);
});