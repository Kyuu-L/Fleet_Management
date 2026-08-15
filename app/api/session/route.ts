import { deleteSession, getAuthenticatedUser } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    return Response.json({ user: await getAuthenticatedUser(request) });
  } catch {
    return Response.json({ user: null });
  }
}

export async function DELETE(request: Request) {
  const cookie = await deleteSession(request);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}
