import { getD1 } from "@/db";
import { canManageWorkshop, getAuthenticatedUser, unauthorized } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!canManageWorkshop(user.role)) return Response.json({ error: "Accès réservé à l'atelier." }, { status: 403 });
    const payload = await request.json() as { vehicleId?: number; status?: string };
    if (!Number.isInteger(payload.vehicleId) || !["Disponible", "HS"].includes(payload.status ?? "")) {
      return Response.json({ error: "Statut invalide." }, { status: 400 });
    }
    await getD1().prepare("UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(payload.status, payload.vehicleId).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Modification impossible." }, { status: 500 });
  }
}
