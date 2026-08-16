import { getD1 } from "@/db";
import { getAuthenticatedUser, unauthorized } from "@/lib/server/auth";
import { storePhotos, validatePhotos } from "@/lib/server/photos";
import { deriveIssueTitle } from "@/lib/server/issue-title";

type IssuePayload = {
  vehicleId?: number;
  category?: string;
  mileage?: number;
  description?: string;
  urgent?: boolean;
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    const form = await request.formData();
    const payload = JSON.parse(String(form.get("payload") ?? "{}")) as IssuePayload;
    const vehicleId = Number(payload.vehicleId);
    const mileage = Number(payload.mileage);
    const category = payload.category?.trim() ?? "";
    const description = payload.description?.trim() ?? "";
    if (!Number.isInteger(vehicleId) || !Number.isInteger(mileage) || !category || !description) {
      return Response.json({ error: "Complétez la catégorie, le kilométrage et la description." }, { status: 400 });
    }
    const files = validatePhotos(form.getAll("photos"));
    //const title = description.split(/[.!?\n]/)[0].slice(0, 72) || category;
    const title = deriveIssueTitle(description, category);
    const urgent = payload.urgent ? 1 : 0;
    const db = getD1();
    const inserted = await db.prepare(`
      INSERT INTO issues (vehicle_id, created_by, category, title, description, mileage, urgent, status, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', 'report') RETURNING id
    `).bind(vehicleId, user.id, category, title, description, mileage, urgent).first<{ id: number }>();
    if (!inserted) throw new Error("Le signalement n'a pas pu être créé.");
    await db.batch([
      db.prepare("UPDATE vehicles SET km = MAX(km, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(mileage, vehicleId),
      db.prepare("INSERT INTO mileage_logs (vehicle_id, user_id, km, source) VALUES (?, ?, ?, 'report')").bind(vehicleId, user.id, mileage),
    ]);
    await storePhotos("issue", inserted.id, files);
    return Response.json({ id: inserted.id, photoCount: files.length }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Signalement impossible." }, { status: 500 });
  }
}
