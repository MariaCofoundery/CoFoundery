import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Die Middleware frischt bei jedem Treffer die Sitzung auf - und das
     * kostet einen Netzwerkgang zum Auth-Server (supabase.auth.getUser()).
     *
     * Bis 18.09.2026 lief sie auch fuer die drei Routen, die BILDER
     * ausliefern. Eine Seite mit zwanzig Profilbildern loeste damit zwanzig
     * zusaetzliche Auth-Abfragen aus, bevor ein einziges Bild ankam - und
     * zwar fuer nichts: Eine Bildantwort traegt keine Sitzung weiter, und
     * jede dieser Routen prueft Anmeldung UND Freigabe selbst
     * (getUser plus can_read_member_photo beziehungsweise is_network_member).
     *
     * Ausgenommen sind deshalb genau diese drei und die ueblichen statischen
     * Pfade. Alles andere - jede Seite, jeder Auth-Weg - laeuft weiter
     * durch.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/profile/photo/|api/connect/photos/|api/connect/venture-logos/).*)",
  ],
};
