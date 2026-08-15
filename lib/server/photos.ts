import { env } from "cloudflare:workers";
import { getD1 } from "@/db";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoSize = 8 * 1024 * 1024;

function getPhotoBucket() {
  if (!env.PHOTOS) throw new Error("Le stockage des photos est indisponible.");
  return env.PHOTOS;
}

export function validatePhotos(values: FormDataEntryValue[], limit = 4) {
  const files = values.filter((value): value is File => value instanceof File && value.size > 0).slice(0, limit);
  for (const file of files) {
    if (!allowedTypes.has(file.type)) throw new Error("Format de photo non pris en charge.");
    if (file.size > maxPhotoSize) throw new Error("Une photo dépasse la taille maximale de 8 Mo.");
  }
  return files;
}

export async function storePhotos(ownerType: "issue" | "weekly_control", ownerId: number, files: File[]) {
  const bucket = getPhotoBucket();
  const db = getD1();
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const objectKey = `${ownerType}/${ownerId}/${crypto.randomUUID()}.${extension}`;
    await bucket.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    await db.prepare("INSERT INTO photos (owner_type, owner_id, object_key, filename, content_type, position) VALUES (?, ?, ?, ?, ?, ?)").bind(ownerType, ownerId, objectKey, file.name || `photo-${index + 1}.${extension}`, file.type, index).run();
  }
}

export async function readPhoto(id: number) {
  const metadata = await getD1().prepare("SELECT object_key AS objectKey, filename, content_type AS contentType FROM photos WHERE id = ?").bind(id).first<{ objectKey: string; filename: string; contentType: string }>();
  if (!metadata) return null;
  const object = await getPhotoBucket().get(metadata.objectKey);
  if (!object) return null;
  return { metadata, object };
}
