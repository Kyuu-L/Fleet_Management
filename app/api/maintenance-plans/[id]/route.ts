import { getD1 } from "@/db";
import { canManageWorkshop, getAuthenticatedUser, unauthorized } from "@/lib/server/auth";

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!canManageWorkshop(user.role)) return Response.json({ error: "Accès réservé à l'atelier." }, { status: 403 });
    const id = new URL(request.url).pathname.split("/").pop();
    if (!id) return Response.json({ error: "Plan invalide." }, { status: 400 });
    const db = getD1();
    const existing = await db.prepare("SELECT id FROM maintenance_plans WHERE id = ?").bind(id).first();
    if (!existing) return Response.json({ error: "Plan introuvable." }, { status: 404 });
    await db.prepare("DELETE FROM maintenance_plans WHERE id = ?").bind(id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Suppression impossible." }, { status: 500 });
  }
}