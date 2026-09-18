import { NextResponse } from "next/server";
import { buildAccountExport } from "@/features/account/accountExport";
import { createClient } from "@/lib/supabase/server";

/**
 * Der Datenexport (Art. 20 DSGVO).
 *
 * Eine Route und kein Server-Action-Download: Ein Browser kann eine Antwort
 * mit Content-Disposition direkt als Datei speichern. Eine Aktion muesste die
 * Daten erst in die Seite reichen und dort zu einer Datei bauen - dann laege
 * der ganze Export im Speicher des Browsers und im Seitenzustand.
 *
 * Gelesen wird mit dem Client der ANGEMELDETEN Person, nicht privilegiert:
 * Die Zeilensicherheit beantwortet "was gehoert dieser Person" schon an jeder
 * Tabelle. Siehe accountExport.ts.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const exported = await buildAccountExport(supabase, user.id);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(exported, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="cofoundery-export-${stamp}.json"`,
      // Ein Export gehoert in keinen Zwischenspeicher - weder im Browser noch
      // unterwegs.
      "cache-control": "no-store, private",
    },
  });
}
