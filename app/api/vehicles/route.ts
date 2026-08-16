import { getD1 } from "@/db";
import { getAuthenticatedUser, isChef, unauthorized } from "@/lib/server/auth";
import { getVehicleModel } from "@/lib/vehicle-models";
import { applyModelPlansToVehicle } from "@/lib/server/maintenance-plans";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!isChef(user.role)) return Response.json({ error: "Accès réservé au chef." }, { status: 403 });
    const payload = await request.json() as { plate?: string; modelId?: string; km?: number };
    const plate = payload.plate?.trim().toUpperCase() ?? "";
    const model = getVehicleModel(payload.modelId);
    const km = Number(payload.km);
    if (!plate || !model || !Number.isInteger(km) || km < 0) {
      return Response.json({ error: "Plaque, modèle et kilométrage sont requis." }, { status: 400 });
    }
    const db = getD1();
    const existing = await db.prepare("SELECT id FROM vehicles WHERE plate = ?").bind(plate).first();
    if (existing) return Response.json({ error: "Cette plaque existe déjà." }, { status: 400 });
    const maxRow = await db.prepare("SELECT MAX(id) AS maxId FROM vehicles").first<{ maxId: number | null }>();
    const nextId = (maxRow?.maxId ?? 0) + 1;
    await db.prepare("INSERT INTO vehicles (id, plate, label, model_id, km, status, maintenance, image) VALUES (?, ?, ?, ?, ?, 'Disponible', 'À jour', ?)")
      .bind(nextId, plate, model.label, model.id, km, model.image).run();
    await applyModelPlansToVehicle(db, nextId, model.id);
    return Response.json({ id: nextId }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ajout impossible." }, { status: 500 });
  }
}