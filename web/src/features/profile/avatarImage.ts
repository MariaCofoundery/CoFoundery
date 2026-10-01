/**
 * Ein Bild aus dem Dateisystem wird zu einem Bild, das man speichern kann.
 *
 * HERAUSGELOEST AM 01.10.2026 aus `ProfileBasicsForm`. Dort stand sie seit
 * dem Einstiegsassistenten; seit das Foto auch unter „Ueber dich" aenderbar
 * ist, brauchen es zwei Stellen. Eine zweite Fassung haette nach dem ersten
 * Unterschied zwei verschiedene Bildgroessen ergeben - und zwar lautlos.
 *
 * ---------------------------------------------------------------------------
 * 320 PIXEL UND JPEG, UND DAS IST DIE GANZE BILDVERARBEITUNG
 * ---------------------------------------------------------------------------
 *
 * Kein Zuschneiden, keine Filter, keine Gesichtserkennung. Die laengste Seite
 * wird auf 320 px gebracht, das Seitenverhaeltnis bleibt. Mehr braucht ein
 * Profilbild nicht, das in Listen und Koepfen erscheint - und was hier nicht
 * entsteht, muss auch niemand speichern.
 *
 * Verkleinert wird IM BROWSER. Die Datei, die jemand auswaehlt, kann zehn
 * Megabyte haben; was den Server erreicht, sind rund dreissig Kilobyte.
 */

export async function toAvatarDataUrl(file: File) {
  const imageBitmapUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageBitmapUrl);
    const maxSize = 320;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("avatar_canvas_unavailable");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(imageBitmapUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("avatar_image_load_failed"));
    image.src = src;
  });
}
