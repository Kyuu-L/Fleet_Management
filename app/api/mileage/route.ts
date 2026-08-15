import { getD1 } from "@/db";
import { getAuthenticatedUser, unauthorized } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    const payload = await request.json() as { vehicleId?: number; mileage?: number };
    const vehicleId = Number(payload.vehicleId);
    const mileage = Number(payload.mileage);
    if (!Number.isInteger(vehicleId) || !Number.isInteger(mileage) || mileage < 0) {
      return Response.json({ error: "Kilométrage invalide." }, { status: 400 });
    }
    const db = getD1();
    const vehicle = await db.prepare("SELECT km FROM vehicles WHERE id = ?").bind(vehicleId).first<{ km: number }>();
    if (!vehicle) return Response.json({ error: "Véhicule introuvable." }, { status: 404 });
    if (mileage < vehicle.km) return Response.json({ error: `Le dernier relevé est déjà de ${vehicle.km} km.` }, { status: 400 });
    await db.batch([
      db.prepare("UPDATE vehicles SET km = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(mileage, vehicleId),
      db.prepare("INSERT INTO mileage_logs (vehicle_id, user_id, km, source) VALUES (?, ?, ?, 'manual')").bind(vehicleId, user.id, mileage),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Enregistrement impossible." }, { status: 500 });
  }
}
