import { getD1 } from "@/db";
import { getAuthenticatedUser, isChef, unauthorized } from "@/lib/server/auth";
import { demoVehiclePlates } from "@/lib/server/seed";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!isChef(user.role)) return Response.json({ error: "Accès réservé au chef." }, { status: 403 });
    const db = getD1();
    const placeholders = demoVehiclePlates.map(() => "?").join(", ");
    const result = await db.prepare(`DELETE FROM vehicles WHERE plate IN (${placeholders})`).bind(...demoVehiclePlates).run();
    return Response.json({ ok: true, deleted: result.meta?.changes ?? 0 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Suppression impossible." }, { status: 500 });
  }
}