import { getAuthenticatedUser, unauthorized } from "@/lib/server/auth";
import { readApplicationState } from "@/lib/server/state";

export async function GET(request: Request) {
  try {
    if (!await getAuthenticatedUser(request)) return unauthorized();
    return Response.json(await readApplicationState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Chargement impossible." }, { status: 500 });
  }
}
