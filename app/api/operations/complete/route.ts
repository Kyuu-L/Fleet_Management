import { getD1 } from "@/db";
import { canManageWorkshop, getAuthenticatedUser, unauthorized } from "@/lib/server/auth";
import { computeNextOperation, formatDate, formatKm } from "@/lib/server/operations";

type OperationPayload = {
  kind?: "operation" | "issue" | "new";
  vehicleId?: number;
  operationId?: string;
  issueId?: number;
  title?: string;
  mileage?: number;
  comment?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!canManageWorkshop(user.role)) return Response.json({ error: "Accès réservé à l'atelier." }, { status: 403 });
    const payload = await request.json() as OperationPayload;
    const vehicleId = Number(payload.vehicleId);
    const mileage = Number(payload.mileage);
    const title = payload.title?.trim() ?? "";
    if (!payload.kind || !Number.isInteger(vehicleId) || !Number.isInteger(mileage) || !title) {
      return Response.json({ error: "Opération incomplète." }, { status: 400 });
    }
    const db = getD1();
    const now = new Date();
    const isoDate = now.toISOString().slice(0, 10);
    const detail = `Réalisée le ${formatDate(now)} à ${formatKm(mileage)}`;

    if (payload.kind === "operation" && payload.operationId) {
      const source = await db.prepare("SELECT category, recurrence_km AS recurrenceKm, recurrence_months AS recurrenceMonths FROM operations WHERE id = ? AND vehicle_id = ? AND status = 'todo'")
        .bind(payload.operationId, vehicleId)
        .first<{ category: string; recurrenceKm: number | null; recurrenceMonths: number | null }>();
      if (!source) return Response.json({ error: "Opération introuvable ou déjà terminée." }, { status: 404 });
      await db.prepare(`
        UPDATE operations SET title = ?, detail = ?, status = 'done', completed_by = ?, completed_date = ?, completed_km = ?, comment = ?
        WHERE id = ?
      `).bind(title, detail, user.name, isoDate, mileage, payload.comment?.trim() || null, payload.operationId).run();

      if (source.recurrenceKm || source.recurrenceMonths) {
        const next = computeNextOperation({ mileage, now, recurrenceKm: source.recurrenceKm, recurrenceMonths: source.recurrenceMonths });
        if (next) {
          await db.prepare(`
          INSERT INTO operations (id, vehicle_id, title, category, detail, status, recurrence_km, recurrence_months, due_km, due_date)
          VALUES (?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?)
          `).bind(`${vehicleId}-${crypto.randomUUID()}-next`, vehicleId, title, source.category, next.nextDetail, source.recurrenceKm, source.recurrenceMonths, next.dueKm, next.dueDate).run();
        }
      }
    } else {
      await db.prepare(`
        INSERT INTO operations (id, vehicle_id, title, category, detail, status, completed_by, completed_date, completed_km, comment, source_issue_id)
        VALUES (?, ?, ?, ?, ?, 'done', ?, ?, ?, ?, ?)
      `).bind(`${vehicleId}-${crypto.randomUUID()}-done`, vehicleId, title, payload.kind === "issue" ? "Signalement" : "Intervention", detail, user.name, isoDate, mileage, payload.comment?.trim() || null, payload.issueId ?? null).run();
      if (payload.kind === "issue" && payload.issueId) {
        await db.prepare("UPDATE issues SET status = 'done', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").bind(payload.issueId).run();
      }
    }

    await db.batch([
      db.prepare("UPDATE vehicles SET km = MAX(km, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(mileage, vehicleId),
      db.prepare("INSERT INTO mileage_logs (vehicle_id, user_id, km, source) VALUES (?, ?, ?, 'operation')").bind(vehicleId, user.id, mileage),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Opération impossible." }, { status: 500 });
  }
}
