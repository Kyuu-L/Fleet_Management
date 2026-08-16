import { getD1 } from "@/db";
import { getAuthenticatedUser, hashPin, isChef, unauthorized } from "@/lib/server/auth";

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    if (!isChef(user.role)) return Response.json({ error: "Accès réservé au chef." }, { status: 403 });
    const id = Number(new URL(request.url).pathname.split("/").pop());
    if (!Number.isInteger(id)) return Response.json({ error: "Utilisateur invalide." }, { status: 400 });
    const payload = await request.json() as { active?: boolean; pin?: string };
    const db = getD1();

    if (typeof payload.active === "boolean") {
      if (id === user.id && !payload.active) {
        return Response.json({ error: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
      }
      await db.prepare("UPDATE users SET active = ?, login_enabled = ? WHERE id = ?")
        .bind(payload.active ? 1 : 0, payload.active ? 1 : 0, id)
        .run();
      if (!payload.active) {
        await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
      }
    }
    if (payload.pin) {
      if (!/^\d{4,6}$/.test(payload.pin)) return Response.json({ error: "Code PIN invalide." }, { status: 400 });
      const target = await db.prepare("SELECT role FROM users WHERE id = ?").bind(id).first<{ role: string }>();
      if (!target) return Response.json({ error: "Utilisateur introuvable." }, { status: 404 });
      const pinHash = await hashPin(payload.pin);
      const duplicate = await db.prepare(`
        SELECT id FROM users
        WHERE role = ? AND pin_hash = ? AND active = 1 AND id != ?
        LIMIT 1
      `).bind(target.role, pinHash, id).first();
      if (duplicate) {
        return Response.json({ error: "Ce code PIN est déjà utilisé pour ce rôle." }, { status: 400 });
      }
      await db.prepare("UPDATE users SET pin_hash = ?, login_enabled = 1 WHERE id = ?").bind(pinHash, id).run();
      await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Modification impossible." }, { status: 500 });
  }
}