import { getD1 } from "@/db";
import { canManageWorkshop, getAuthenticatedUser, unauthorized } from "@/lib/server/auth";
import { listMaintenancePlans, syncMaintenancePlan } from "@/lib/server/maintenance-plans";
import { vehicleModels } from "@/lib/vehicle-models";

type PlanPayload = {
  scope?: "model" | "vehicle";
  modelId?: string;
  vehicleId?: number;
  title?: string;
  category?: string;
  recurrenceKm?: number;
  recurrenceMonths?: number;
};

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!canManageWorkshop(user.role)) return Response.json({ error: "Accès réservé à l'atelier." }, { status: 403 });
    const result = await listMaintenancePlans(getD1());
    return Response.json({ plans: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Chargement impossible." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!canManageWorkshop(user.role)) return Response.json({ error: "Accès réservé à l'atelier." }, { status: 403 });
    const payload = await request.json() as PlanPayload;
    const title = payload.title?.trim() ?? "";
    const category = payload.category?.trim() ?? "";
    const recurrenceKm = payload.recurrenceKm ? Number(payload.recurrenceKm) : null;
    const recurrenceMonths = payload.recurrenceMonths ? Number(payload.recurrenceMonths) : null;

    if (!title || !category || (!recurrenceKm && !recurrenceMonths)) {
      return Response.json({ error: "Titre, catégorie et au moins une récurrence sont requis." }, { status: 400 });
    }
    if (recurrenceKm !== null && (!Number.isInteger(recurrenceKm) || recurrenceKm <= 0)) {
      return Response.json({ error: "Récurrence kilométrique invalide." }, { status: 400 });
    }
    if (recurrenceMonths !== null && (!Number.isInteger(recurrenceMonths) || recurrenceMonths <= 0)) {
      return Response.json({ error: "Récurrence mensuelle invalide." }, { status: 400 });
    }

    const db = getD1();
    let scope: "model" | "vehicle";
    let modelId: string | null = null;
    let vehicleId: number | null = null;

    if (payload.scope === "model") {
      const model = vehicleModels.find((item) => item.id === payload.modelId);
      if (!model) return Response.json({ error: "Modèle invalide." }, { status: 400 });
      scope = "model";
      modelId = model.id;
    } else if (payload.scope === "vehicle") {
      const vehicleIdValue = Number(payload.vehicleId);
      if (!Number.isInteger(vehicleIdValue)) return Response.json({ error: "Véhicule invalide." }, { status: 400 });
      const vehicle = await db.prepare("SELECT id FROM vehicles WHERE id = ?").bind(vehicleIdValue).first();
      if (!vehicle) return Response.json({ error: "Véhicule introuvable." }, { status: 404 });
      scope = "vehicle";
      vehicleId = vehicleIdValue;
    } else {
      return Response.json({ error: "Choisissez un modèle ou un véhicule." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO maintenance_plans (id, scope, model_id, vehicle_id, title, category, recurrence_km, recurrence_months)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, scope, modelId, vehicleId, title, category, recurrenceKm, recurrenceMonths).run();

    const created = await syncMaintenancePlan(db, id);
    return Response.json({ id, generatedOperations: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Création impossible." }, { status: 500 });
  }
}