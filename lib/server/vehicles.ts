import type { getD1 } from "@/db";
import { getVehicleModel } from "@/lib/vehicle-models";
import { applyModelPlansToVehicle } from "./maintenance-plans";

type D1Database = ReturnType<typeof getD1>;

export type CreateVehicleInput = { plate: string; modelId: string; km: number };
export type CreateVehicleResult =
  | { ok: true; id: number; plate: string }
  | { ok: false; plate: string; error: string };

export async function createVehicle(db: D1Database, input: CreateVehicleInput): Promise<CreateVehicleResult> {
  const plate = input.plate.trim().toUpperCase();
  const model = getVehicleModel(input.modelId);
  const km = Number(input.km);

  if (!plate) return { ok: false, plate, error: "Plaque manquante." };
  if (!model) return { ok: false, plate, error: "Modèle inconnu." };
  if (!Number.isInteger(km) || km < 0) return { ok: false, plate, error: "Kilométrage invalide." };

  const existing = await db.prepare("SELECT id FROM vehicles WHERE plate = ?").bind(plate).first();
  if (existing) return { ok: false, plate, error: "Cette plaque existe déjà." };

  const maxRow = await db.prepare("SELECT MAX(id) AS maxId FROM vehicles").first<{ maxId: number | null }>();
  const nextId = (maxRow?.maxId ?? 0) + 1;
  await db.prepare("INSERT INTO vehicles (id, plate, label, model_id, km, status, maintenance, image) VALUES (?, ?, ?, ?, ?, 'Disponible', 'À jour', ?)")
    .bind(nextId, plate, model.label, model.id, km, model.image).run();
  await applyModelPlansToVehicle(db, nextId, model.id);

  return { ok: true, id: nextId, plate };
}