import { getD1 } from "@/db";
import { getAuthenticatedUser, unauthorized } from "@/lib/server/auth";
import { storePhotos, validatePhotos } from "@/lib/server/photos";

type WeeklyPayload = {
  vehicleId?: number;
  mileage?: number;
  checks?: Record<string, string>;
  notes?: Record<string, string>;
  padThickness?: { front?: string; rear?: string };
  licenceNumber?: string;
  damageState?: string;
  damageNotes?: string;
  comment?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    const form = await request.formData();
    const payload = JSON.parse(String(form.get("payload") ?? "{}")) as WeeklyPayload;
    const files = validatePhotos(form.getAll("photos"));
    const vehicleId = Number(payload.vehicleId);
    const mileage = Number(payload.mileage);
    if (!Number.isInteger(vehicleId) || !Number.isInteger(mileage) || files.length !== 4) {
      return Response.json({ error: "Le contrôle doit contenir le kilométrage et les quatre photos obligatoires." }, { status: 400 });
    }
    const db = getD1();
    const inserted = await db.prepare("INSERT INTO weekly_controls (vehicle_id, user_id, mileage, answers, comment) VALUES (?, ?, ?, ?, ?) RETURNING id")
      .bind(vehicleId, user.id, mileage, JSON.stringify(payload), payload.comment?.trim() ?? "")
      .first<{ id: number }>();
    if (!inserted) throw new Error("Le contrôle n'a pas pu être créé.");

    const tasks: Array<{ title: string; category: string; detail: string }> = [];
    const notes = payload.notes ?? {};
    const checks = payload.checks ?? {};
    if (checks.frontTyres === "problem") tasks.push({ title: "Problème sur les pneus avant", category: "Pneumatiques", detail: notes.frontTyres?.trim() || "Anomalie relevée lors du contrôle hebdomadaire" });
    if (checks.rearTyres === "problem") tasks.push({ title: "Problème sur les pneus arrière", category: "Pneumatiques", detail: notes.rearTyres?.trim() || "Anomalie relevée lors du contrôle hebdomadaire" });
    if (checks.parkingBrake === "problem") tasks.push({ title: "Problème de frein à main", category: "Freinage", detail: notes.parkingBrake?.trim() || "Anomalie relevée lors du contrôle hebdomadaire" });
    const frontPads = Number(payload.padThickness?.front);
    const rearPads = Number(payload.padThickness?.rear);
    if (Number.isFinite(frontPads) && frontPads <= 3) tasks.push({ title: `Plaquettes avant à ${frontPads} mm`, category: "Freinage", detail: "Seuil atelier atteint" });
    if (Number.isFinite(rearPads) && rearPads <= 3) tasks.push({ title: `Plaquettes arrière à ${rearPads} mm`, category: "Freinage", detail: "Seuil atelier atteint" });

    const statements = [
      db.prepare("UPDATE vehicles SET km = MAX(km, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(mileage, vehicleId),
      db.prepare("INSERT INTO mileage_logs (vehicle_id, user_id, km, source) VALUES (?, ?, ?, 'weekly')").bind(vehicleId, user.id, mileage),
      ...tasks.map((task) => db.prepare(`
        INSERT INTO issues (vehicle_id, created_by, category, title, description, mileage, urgent, status, source)
        VALUES (?, ?, ?, ?, ?, ?, 0, 'todo', 'weekly')
      `).bind(vehicleId, user.id, task.category, task.title, task.detail, mileage)),
    ];
    await db.batch(statements);
    await storePhotos("weekly_control", inserted.id, files);
    return Response.json({ id: inserted.id, generatedTasks: tasks.length }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Contrôle impossible." }, { status: 500 });
  }
}
