import { getD1 } from "@/db";
import { canManageWorkshop, getAuthenticatedUser, unauthorized } from "@/lib/server/auth";
import { formatDate, formatKm } from "@/lib/server/operations";

type SchedulePayload = {
  vehicleId?: number;
  title?: string;
  category?: string;
  detail?: string;
  dueKm?: number;
  dueDate?: string;
  recurrenceKm?: number;
  recurrenceMonths?: number;
};

function buildScheduledDetail(payload: SchedulePayload) {
  const customDetail = payload.detail?.trim();
  if (customDetail) return customDetail;

  const parts: string[] = [];
  if (typeof payload.dueKm === "number") parts.push(`Prévue à ${formatKm(payload.dueKm)}`);
  if (payload.dueDate) parts.push(`À réaliser avant le ${formatDate(new Date(`${payload.dueDate}T00:00:00Z`))}`);
  if (payload.recurrenceKm) parts.push(`tous les ${new Intl.NumberFormat("fr-FR").format(payload.recurrenceKm)} km`);
  if (payload.recurrenceMonths) parts.push(`renouvellement ${payload.recurrenceMonths} mois`);
  return parts.join(" · ") || "Opération planifiée";
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!canManageWorkshop(user.role)) return Response.json({ error: "Accès réservé à l'atelier." }, { status: 403 });

    const payload = await request.json() as SchedulePayload;
    const vehicleId = Number(payload.vehicleId);
    const title = payload.title?.trim() ?? "";
    const category = payload.category?.trim() ?? "";
    const dueKm = payload.dueKm === undefined ? null : Number(payload.dueKm);
    const recurrenceKm = payload.recurrenceKm === undefined ? null : Number(payload.recurrenceKm);
    const recurrenceMonths = payload.recurrenceMonths === undefined ? null : Number(payload.recurrenceMonths);
    const dueDate = payload.dueDate?.trim() || null;

    if (!Number.isInteger(vehicleId) || !title || !category) {
      return Response.json({ error: "Véhicule, titre et catégorie sont requis." }, { status: 400 });
    }
    if (dueKm !== null && (!Number.isInteger(dueKm) || dueKm < 0)) {
      return Response.json({ error: "Échéance kilométrique invalide." }, { status: 400 });
    }
    if (recurrenceKm !== null && (!Number.isInteger(recurrenceKm) || recurrenceKm <= 0)) {
      return Response.json({ error: "Récurrence kilométrique invalide." }, { status: 400 });
    }
    if (recurrenceMonths !== null && (!Number.isInteger(recurrenceMonths) || recurrenceMonths <= 0)) {
      return Response.json({ error: "Récurrence mensuelle invalide." }, { status: 400 });
    }
    if (dueDate && Number.isNaN(new Date(`${dueDate}T00:00:00Z`).getTime())) {
      return Response.json({ error: "Date d'échéance invalide." }, { status: 400 });
    }
    if (dueKm === null && !dueDate && recurrenceKm === null && recurrenceMonths === null) {
      return Response.json({ error: "Indiquez au moins une échéance ou une récurrence." }, { status: 400 });
    }

    const db = getD1();
    const vehicle = await db.prepare("SELECT id FROM vehicles WHERE id = ?").bind(vehicleId).first();
    if (!vehicle) return Response.json({ error: "Véhicule introuvable." }, { status: 404 });

    const id = `${vehicleId}-${crypto.randomUUID()}-planned`;
    await db.prepare(`
      INSERT INTO operations (id, vehicle_id, title, category, detail, status, recurrence_km, recurrence_months, due_km, due_date)
      VALUES (?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?)
    `).bind(
      id,
      vehicleId,
      title,
      category,
      buildScheduledDetail(payload),
      recurrenceKm,
      recurrenceMonths,
      dueKm,
      dueDate,
    ).run();

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Planification impossible." }, { status: 500 });
  }
}
