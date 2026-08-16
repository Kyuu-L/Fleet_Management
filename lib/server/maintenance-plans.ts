import type { getD1 } from "@/db";
import { formatDate, formatKm } from "./operations";

type D1Database = ReturnType<typeof getD1>;

export type MaintenancePlanRecord = {
  id: string;
  scope: "model" | "vehicle";
  modelId: string | null;
  vehicleId: number | null;
  title: string;
  category: string;
  recurrenceKm: number | null;
  recurrenceMonths: number | null;
};

type VehicleTarget = {
  id: number;
  km: number;
};

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString().slice(0, 10);
}

export function buildPlanDetail(plan: Pick<MaintenancePlanRecord, "recurrenceKm" | "recurrenceMonths">, dueKm: number | null, dueDate: string | null) {
  const parts: string[] = [];
  if (dueKm !== null) parts.push(`Prévue à ${formatKm(dueKm)}`);
  if (dueDate) parts.push(`À réaliser avant le ${formatDate(new Date(`${dueDate}T00:00:00Z`))}`);
  if (plan.recurrenceKm) parts.push(`tous les ${formatKm(plan.recurrenceKm)}`);
  if (plan.recurrenceMonths) parts.push(`renouvellement ${plan.recurrenceMonths} mois`);
  return parts.join(" · ") || "Entretien périodique";
}

export function computeInitialDue(vehicleKm: number, recurrenceKm: number | null, recurrenceMonths: number | null, now = new Date()) {
  return {
    dueKm: recurrenceKm ? vehicleKm + recurrenceKm : null,
    dueDate: recurrenceMonths ? addMonths(now, recurrenceMonths) : null,
  };
}

export async function listMaintenancePlans(db: D1Database) {
  return db.prepare(`
    SELECT id, scope, model_id AS modelId, vehicle_id AS vehicleId, title, category,
           recurrence_km AS recurrenceKm, recurrence_months AS recurrenceMonths
    FROM maintenance_plans
    ORDER BY scope, title, id
  `).all<MaintenancePlanRecord>();
}

async function listPlanTargets(db: D1Database, plan: MaintenancePlanRecord) {
  if (plan.scope === "vehicle" && plan.vehicleId) {
    const vehicle = await db.prepare("SELECT id, km FROM vehicles WHERE id = ?").bind(plan.vehicleId).first<VehicleTarget>();
    return vehicle ? [vehicle] : [];
  }
  if (plan.scope === "model" && plan.modelId) {
    const result = await db.prepare("SELECT id, km FROM vehicles WHERE model_id = ? ORDER BY id").bind(plan.modelId).all<VehicleTarget>();
    return result.results;
  }
  return [];
}

export async function ensureVehiclePlanOperation(db: D1Database, plan: MaintenancePlanRecord, vehicle: VehicleTarget, now = new Date()) {
  const existing = await db.prepare(`
    SELECT id FROM operations
    WHERE plan_id = ? AND vehicle_id = ? AND status = 'todo'
    LIMIT 1
  `).bind(plan.id, vehicle.id).first();
  if (existing) return false;

  const { dueKm, dueDate } = computeInitialDue(vehicle.km, plan.recurrenceKm, plan.recurrenceMonths, now);
  const operationId = `${vehicle.id}-${plan.id}-${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO operations (id, vehicle_id, title, category, detail, status, recurrence_km, recurrence_months, due_km, due_date, plan_id)
    VALUES (?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?)
  `).bind(
    operationId,
    vehicle.id,
    plan.title,
    plan.category,
    buildPlanDetail(plan, dueKm, dueDate),
    plan.recurrenceKm,
    plan.recurrenceMonths,
    dueKm,
    dueDate,
    plan.id,
  ).run();
  return true;
}

export async function syncMaintenancePlan(db: D1Database, planId: string, now = new Date()) {
  const plan = await db.prepare(`
    SELECT id, scope, model_id AS modelId, vehicle_id AS vehicleId, title, category,
           recurrence_km AS recurrenceKm, recurrence_months AS recurrenceMonths
    FROM maintenance_plans
    WHERE id = ?
  `).bind(planId).first<MaintenancePlanRecord>();
  if (!plan) return 0;

  const targets = await listPlanTargets(db, plan);
  let created = 0;
  for (const vehicle of targets) {
    if (await ensureVehiclePlanOperation(db, plan, vehicle, now)) created += 1;
  }
  return created;
}

export async function applyModelPlansToVehicle(db: D1Database, vehicleId: number, modelId: string, now = new Date()) {
  const plans = await db.prepare(`
    SELECT id, scope, model_id AS modelId, vehicle_id AS vehicleId, title, category,
           recurrence_km AS recurrenceKm, recurrence_months AS recurrenceMonths
    FROM maintenance_plans
    WHERE scope = 'model' AND model_id = ?
  `).bind(modelId).all<MaintenancePlanRecord>();

  const vehicle = await db.prepare("SELECT id, km FROM vehicles WHERE id = ?").bind(vehicleId).first<VehicleTarget>();
  if (!vehicle) return 0;

  let created = 0;
  for (const plan of plans.results) {
    if (await ensureVehiclePlanOperation(db, plan, vehicle, now)) created += 1;
  }
  return created;
}
