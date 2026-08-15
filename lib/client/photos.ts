const maxPhotoBytes = 800 * 1024;
const maxPhotoEdge = 1600;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("La photo n'a pas pu être préparée.")),
      "image/jpeg",
      quality,
    );
  });
}

export async function preparePhotoFile(file: File) {
  if (file.size <= maxPhotoBytes) return file;

  try {
    const image = await createImageBitmap(file, { imageOrientation: "from-image" });
    let scale = Math.min(1, maxPhotoEdge / Math.max(image.width, image.height));
    let quality = 0.82;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("La photo n'a pas pu être préparée.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      blob = await canvasToBlob(canvas, quality);
      if (blob.size <= maxPhotoBytes) break;
      quality = Math.max(0.55, quality - 0.08);
      scale *= 0.82;
    }

    image.close();
    if (!blob || blob.size > maxPhotoBytes) throw new Error("La photo n'a pas pu être suffisamment réduite.");
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    throw new Error("Cette photo est trop lourde ou illisible. Essayez de la reprendre.");
  }
}
