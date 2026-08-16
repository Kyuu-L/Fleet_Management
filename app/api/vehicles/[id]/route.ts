import { getD1 } from "@/db";
import { getAuthenticatedUser, isChef, unauthorized } from "@/lib/server/auth";

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!isChef(user.role)) return Response.json({ error: "Accès réservé au chef." }, { status: 403 });
    const id = Number(new URL(request.url).pathname.split("/").pop());
    if (!Number.isInteger(id)) return Response.json({ error: "Véhicule invalide." }, { status: 400 });
    const db = getD1();
    const existing = await db.prepare("SELECT id FROM vehicles WHERE id = ?").bind(id).first();
    if (!existing) return Response.json({ error: "Véhicule introuvable." }, { status: 404 });
    await db.prepare("DELETE FROM vehicles WHERE id = ?").bind(id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Suppression impossible." }, { status: 500 });
  }
}