import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocalSupabaseUrl } from "@/features/auth/devLogin";

/**
 * Anmelden ohne Postfach - nur lokal.
 *
 * GEMELDET AM 25.09.2026: "Ich wuerde das super gerne auf localhost gucken,
 * das Problem ist, dass ich mich nicht einloggen kann, weil die E-Mail da
 * nicht geschickt wird."
 *
 * Die Mail wird durchaus geschickt - sie landet im lokalen Postfach des
 * Supabase-Stacks (http://localhost:54324) und nicht im echten. Das ist der
 * Weg, der immer geht und nichts voraussetzt. Diese Seite spart ihn ab: ein
 * Knopf statt Postfach, Link, neue Sitzung.
 *
 * ---------------------------------------------------------------------------
 * ZWEI SPERREN, UND SIE PRUEFEN VERSCHIEDENES
 * ---------------------------------------------------------------------------
 *
 *   1. `NODE_ENV === "production"` - dasselbe Muster wie bei den vorhandenen
 *      Debug-Seiten unter `/debug/*`. Im Bau von Vercel gibt es diese Seite
 *      nicht, sie antwortet mit 404.
 *
 *   2. Die Datenbank muss lokal sein. Das ist die eigentliche Sperre: `NODE_ENV`
 *      sagt, wofuer man den Lauf HAELT, und das kann falsch sein. Die Adresse
 *      sagt, wohin man sich WIRKLICH anmeldet. Selbst ein Entwicklungslauf
 *      gegen die echte Datenbank kommt hier nicht durch.
 *
 * ES GIBT HIER KEIN EINGABEFELD. Die Zugangsdaten stehen fest und gehoeren zu
 * dem Konto, das `npm run dev:seed` anlegt. Ein Formular waere eine
 * Anmeldemaske ohne Ratenbegrenzung - gebaut fuer die Bequemlichkeit, aber
 * gegen die Anmeldung des Produkts. Hier kommt man an genau ein Testkonto,
 * oder an gar keins.
 */

export const dynamic = "force-dynamic";

const TEST_EMAIL = "dev@cofoundery.local";
const TEST_PASSWORD = "cofoundery-local-only";

export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  if (!isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) notFound();

  const params = await searchParams;

  async function signIn() {
    "use server";

    // Die Sperren noch einmal, hier in der Aktion. Eine Pruefung, die nur beim
    // Zeichnen der Seite stattfindet, schuetzt die Aktion nicht - Server
    // Actions sind eigene Eintrittspunkte und werden auch ohne die Seite
    // aufgerufen.
    if (process.env.NODE_ENV === "production") notFound();
    if (!isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) notFound();

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (error) redirect("/dev-login?error=1");
    redirect("/me/profile");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-dashed border-amber-400 bg-amber-50/60 p-6">
        {/* Gestrichelt und bernsteinfarben, damit auf den ersten Blick klar
            ist, dass das kein Teil des Produkts ist. */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
          Nur lokal
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">Testprofil öffnen</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          Meldet dich als <code className="rounded bg-white px-1 py-0.5 text-xs">{TEST_EMAIL}</code>{" "}
          an. Diese Seite gibt es nur, solange die App gegen eine lokale Datenbank läuft.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
            Anmeldung fehlgeschlagen. Gibt es das Testkonto schon? Es entsteht mit{" "}
            <code className="rounded bg-white px-1 py-0.5 text-xs">npm run dev:seed</code>.
          </p>
        ) : null}

        <form action={signIn} className="mt-5">
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white"
          >
            Als Testprofil anmelden
          </button>
        </form>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Ohne Testkonto: <code>npm run dev:seed</code> im Ordner <code>web/</code>. Der normale
          Weg über die E-Mail funktioniert lokal auch — die Mail liegt dann unter{" "}
          <a className="underline" href="http://localhost:54324" rel="noreferrer">
            localhost:54324
          </a>
          .
        </p>
      </div>
    </main>
  );
}
