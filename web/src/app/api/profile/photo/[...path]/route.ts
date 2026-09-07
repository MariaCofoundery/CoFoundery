import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Der Speicherpfad entsteht in features/profile/actions.ts als
// `${userId}/${Date.now()}-${randomUUID()}.${extension}`. Die Route akzeptiert
// nur genau diese Form, damit kein Pfad ausserhalb des Bucket-Layouts
// durchgereicht werden kann.
const PATH_PATTERN =
  /^[0-9a-f-]{36}\/\d+-[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$/i;

/**
 * Liefert ein hochgeladenes Profilbild aus dem privaten avatars-Bucket.
 *
 * Vorher war der Bucket oeffentlich: jede Datei ohne Login per URL abrufbar.
 * Jetzt braucht es eine Sitzung. Die Storage-Policy erlaubt angemeldeten
 * Personen das Lesen, deshalb genuegt der normale Nutzer-Client - es wird kein
 * Service-Role-Schluessel gebraucht und damit kein privilegierter Pfad
 * geschaffen.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const objectPath = (path ?? []).join("/");
  if (!PATH_PATTERN.test(objectPath)) {
    return new NextResponse(null, { status: 404 });
  }

  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new NextResponse(null, { status: 404 });

  const { data, error } = await client.storage.from("avatars").download(objectPath);
  if (error || !data) return new NextResponse(null, { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      // Privat und nur fuer die eigene Sitzung zwischenspeicherbar. Kein
      // gemeinsamer Cache, damit ein spaeter entzogener Zugriff auch wirkt.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, noimageindex",
    },
  });
}
