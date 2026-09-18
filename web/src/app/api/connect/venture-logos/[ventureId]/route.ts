import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Liefert das Logo eines Unternehmens aus dem privaten Bucket.
 *
 * Dieselbe Bauart wie die Profilfoto-Route: Der Bucket ist privat, die
 * Zeilensicherheit der Tabelle entscheidet, wer den Datensatz ueberhaupt
 * sieht - und wer ihn nicht sieht, bekommt hier eine 404 statt eines Bildes.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ventureId: string }> }
) {
  const { ventureId } = await params;
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const { data: eligible } = await client.rpc("is_network_member");
  if (eligible !== true) return new NextResponse(null, { status: 403 });

  // Die Zeilensicherheit macht die Zugriffspruefung: Ein Unternehmen an einem
  // pausierten Profil kommt hier gar nicht erst an.
  const { data: venture } = await client
    .from("network_ventures")
    .select("logo_path")
    .eq("id", ventureId)
    .maybeSingle();
  const logoPath = (venture as { logo_path: string | null } | null)?.logo_path;
  if (!logoPath) return new NextResponse(null, { status: 404 });

  const { data, error } = await client.storage.from("network-profile-images").download(logoPath);
  if (error || !data) return new NextResponse(null, { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": data.type || "image/png",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
