import { getD1 } from "@/db";
import { ensureDemoData } from "./seed";

export type AuthenticatedUser = {
  id: number;
  name: string;
  initials: string;
  role: "salarie" | "mecano" | "chef";
};

const SESSION_COOKIE = "flotte_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function hashPin(pin: string) {
  const encoded = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function authenticateRole(role: string, pin: string) {
  await ensureDemoData();
  const db = getD1();
  const user = await db.prepare("SELECT id, name, initials, role, pin_hash AS pinHash FROM users WHERE role = ? AND login_enabled = 1 AND active = 1 LIMIT 1").bind(role).first<AuthenticatedUser & { pinHash: string }>();
  if (!user || user.pinHash !== await hashPin(pin)) return null;
  return { id: user.id, name: user.name, initials: user.initials, role: user.role } satisfies AuthenticatedUser;
}

export async function createSession(userId: number) {
  const db = getD1();
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  await db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").bind(token, userId, expiresAt).run();
  return {
    token,
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`,
  };
}

export async function getAuthenticatedUser(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const db = getD1();
  const user = await db.prepare(`
    SELECT u.id, u.name, u.initials, u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ? AND u.active = 1
    LIMIT 1
  `).bind(token, new Date().toISOString()).first<AuthenticatedUser>();
  return user ?? null;
}

export async function deleteSession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await getD1().prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function unauthorized() {
  return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
}

export function canManageWorkshop(role: AuthenticatedUser["role"]) {
  return role === "mecano" || role === "chef";
}
