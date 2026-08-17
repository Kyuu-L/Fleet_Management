import { getD1 } from "@/db";
import { getAuthenticatedUser, isChef, unauthorized } from "@/lib/server/auth";
import { createVehicle } from "@/lib/server/vehicles";

type BulkVehicle = { plate?: string; modelId?: string; km?: number };

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!isChef(user.role)) return Response.json({ error: "Accès réservé au chef." }, { status: 403 });
    const payload = await request.json() as { vehicles?: BulkVehicle[] };
    const rows = Array.isArray(payload.vehicles) ? payload.vehicles : [];
    if (rows.length === 0) return Response.json({ error: "Aucun véhicule à importer." }, { status: 400 });
    if (rows.length > 200) return Response.json({ error: "Trop de véhicules en une fois (200 maximum)." }, { status: 400 });

    const db = getD1();
    const created: string[] = [];
    const failed: { plate: string; error: string }[] = [];

    for (const row of rows) {
      const result = await createVehicle(db, {
        plate: row.plate?.trim() ?? "",
        modelId: row.modelId?.trim() ?? "",
        km: Number(row.km ?? 0),
      });
      if (result.ok) created.push(result.plate);
      else failed.push({ plate: row.plate?.trim() || "(plaque vide)", error: result.error });
    }

    return Response.json({ createdCount: created.length, failed }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Import impossible." }, { status: 500 });
  }
}