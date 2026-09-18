import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies.
            // Middleware handles session refresh writes.
          }
        },
      },
    }
  );
};

/**
 * Die angemeldete Person - einmal je Anfrage, nicht einmal je Aufruf.
 *
 * `auth.getUser()` fragt jedes Mal den Auth-Server: ein Netzwerkgang, bevor
 * ueberhaupt eine Datenabfrage beginnt. Am 18.09.2026 machten 19 Seiten zwei
 * bis vier davon je Aufbau - das Dashboard vier, dazu eine in der Middleware.
 * Fuenf Netzwerkgaenge fuer dieselbe Auskunft.
 *
 * React `cache()` merkt sich das Ergebnis fuer die Dauer EINER Anfrage. Die
 * Rueckgabeform ist absichtlich dieselbe wie bei `auth.getUser()`, damit an
 * den Aufrufstellen nur der Aufruf getauscht werden muss.
 *
 * WO DAS NICHT BENUTZT WERDEN DARF:
 *
 *   Ueberall dort, wo sich die Anmeldung WAEHREND der Anfrage aendert. Das
 *   sind die Auth-Wege (/auth/callback, /auth/confirm, /auth/landing): Dort
 *   wird zuerst geprueft, ob schon eine Sitzung besteht, dann eine angelegt,
 *   und danach noch einmal gelesen. Mit Cache kaeme beim zweiten Mal die
 *   Antwort von vorher - die Person waere nach dem Anmelden nicht angemeldet.
 *
 *   Ebenso in Aktionen, die selbst an der Anmeldung drehen: abmelden, Konto
 *   loeschen, Adresse wechseln.
 *
 * Ein Test haelt diese Grenze fest.
 */
export const getRequestUser = cache(async () => {
  const client = await createClient();
  return await client.auth.getUser();
});
