import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Der Blog ist oeffentlich und braucht weder Anmeldung noch Menue. Die Anfrage bekommt deshalb einen eigenen Hinweis fuer das Wurzel-Layout,
 * das fuer Blog-Seiten die ganze App-Huelle ueberspringt: keine Abfragen zu Konto, Rollen und Zaehlern, keine App-Texte im Seitenquelltext.
 * Der Hinweis wird bei JEDER Anfrage gesetzt (auch auf "0"), damit ihn niemand von aussen mitschicken kann.
 */
export const BLOG_REQUEST_HEADER = "x-blog-request";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isBlog = pathname === "/blog" || pathname.startsWith("/blog/");
  request.headers.set(BLOG_REQUEST_HEADER, isBlog ? "1" : "0");
  // Keine Sitzung zu erneuern, keine Abfrage beim Anmelde-Dienst: ein oeffentlicher Besuch kostet so nur die Seite selbst.
  if (isBlog) return NextResponse.next({ request: { headers: request.headers } });
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
     * Ausgenommen sind deshalb genau diese drei, das oeffentliche Logo der
     * Programmseite (`api/program-logo/`, es prueft selbst, ob die Seite veroeffentlicht
     * ist), die Anhaenge im Teamraum-Chat (`api/org-chat-file/`, getUser plus
     * can_read_org_chat) und die ueblichen statischen Pfade. Alles andere - jede Seite, jeder Auth-Weg - laeuft weiter
     * durch.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/profile/photo/|api/connect/photos/|api/connect/venture-logos/|api/program-logo/|api/org-chat-file/).*)",
  ],
};
