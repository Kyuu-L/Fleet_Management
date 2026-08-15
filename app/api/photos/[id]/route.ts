import { getAuthenticatedUser, unauthorized } from "@/lib/server/auth";
import { readPhoto } from "@/lib/server/photos";

export async function GET(request: Request) {
  if (!await getAuthenticatedUser(request)) return unauthorized();
  const id = Number(new URL(request.url).pathname.split("/").pop());
  if (!Number.isInteger(id)) return new Response("Photo introuvable", { status: 404 });
  const photo = await readPhoto(id);
  if (!photo) return new Response("Photo introuvable", { status: 404 });
  const headers = new Headers();
  photo.object.writeHttpMetadata(headers);
  headers.set("Content-Type", photo.metadata.contentType);
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(photo.object.body, { headers });
}
