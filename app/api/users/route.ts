import { getD1 } from "@/db";
import { getAuthenticatedUser, hashPin, isChef, unauthorized } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!isChef(user.role)) return Response.json({ error: "Accès réservé au chef." }, { status: 403 });
    const db = getD1();
    const result = await db.prepare(
      "SELECT id, name, initials, role, login_enabled AS loginEnabled, active FROM users ORDER BY role, name"
    ).all();
    return Response.json({ users: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Chargement impossible." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!isChef(user.role)) return Response.json({ error: "Accès réservé au chef." }, { status: 403 });
    const payload = await request.json() as { name?: string; role?: string; pin?: string };
    const name = payload.name?.trim() ?? "";
    const role = payload.role ?? "";
    const pin = payload.pin ?? "";
    if (!name || !["salarie", "mecano", "chef"].includes(role) || !/^\d{4,6}$/.test(pin)) {
      return Response.json({ error: "Nom, rôle et code PIN (4 à 6 chiffres) sont requis." }, { status: 400 });
    }
    const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "??";
    const pinHash = await hashPin(pin);
    const db = getD1();
    const inserted = await db.prepare(
      "INSERT INTO users (name, initials, role, pin_hash, login_enabled, active) VALUES (?, ?, ?, ?, 1, 1) RETURNING id"
    ).bind(name, initials, role, pinHash).first<{ id: number }>();
    return Response.json({ id: inserted?.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Création impossible." }, { status: 500 });
  }
}