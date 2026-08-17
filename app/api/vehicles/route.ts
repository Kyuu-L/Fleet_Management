import { getD1 } from "@/db";
import { getAuthenticatedUser, isChef, unauthorized } from "@/lib/server/auth";
import { createVehicle } from "@/lib/server/vehicles";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!isChef(user.role)) return Response.json({ error: "Accès réservé au chef." }, { status: 403 });
    const payload = await request.json() as { plate?: string; modelId?: string; km?: number };
    if (!payload.plate?.trim() || !payload.modelId || !Number.isInteger(Number(payload.km))) {
      return Response.json({ error: "Plaque, modèle et kilométrage sont requis." }, { status: 400 });
    }
    const result = await createVehicle(getD1(), { plate: payload.plate, modelId: payload.modelId, km: Number(payload.km) });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ id: result.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ajout impossible." }, { status: 500 });
  }
}