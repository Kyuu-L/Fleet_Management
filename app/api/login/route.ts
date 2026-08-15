import { authenticateRole, createSession } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { role?: string; pin?: string };
    if (!payload.role || !/^\d{4,6}$/.test(payload.pin ?? "")) {
      return Response.json({ error: "Saisissez un code PIN valide." }, { status: 400 });
    }
    const user = await authenticateRole(payload.role, payload.pin!);
    if (!user) return Response.json({ error: "Profil ou code PIN incorrect." }, { status: 401 });
    const session = await createSession(user.id);
    return Response.json({ user }, { headers: { "Set-Cookie": session.cookie } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Connexion impossible." }, { status: 500 });
  }
}
