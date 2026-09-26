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

const TEST_PASSWORD = "cofoundery-local-only";

/**
 * Die Konten, die `npm run dev:seed` anlegt.
 *
 * EINE FESTE LISTE UND KEIN EINGABEFELD. Ein Formular mit freier Mailadresse
 * waere eine Anmeldemaske ohne Ratenbegrenzung - gebaut fuer die
 * Bequemlichkeit, aber gegen die Anmeldung des Produkts. Hier kommt man an
 * genau diese Konten, oder an gar keins.
 *
 * ZWEI SEITEN, WEIL ES ZWEI SEITEN GIBT: Die Freigabe hat eine, die fragt,
 * und eine, die entscheidet. Wer nur eine davon ansehen kann, sieht die
 * Haelfte.
 */
const ACCOUNTS = {
  founder: { email: "dev@cofoundery.local", next: "/me/profile" },
  advisor: { email: "advisor@cofoundery.local", next: "/advisor/dashboard" },
} as const;

type AccountKey = keyof typeof ACCOUNTS;

function isAccountKey(value: string | undefined): value is AccountKey {
  return value === "founder" || value === "advisor";
}

export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; as?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  if (!isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) notFound();

  const params = await searchParams;

  async function signIn(formData: FormData) {
    "use server";

    // Die Sperren noch einmal, hier in der Aktion. Eine Pruefung, die nur beim
    // Zeichnen der Seite stattfindet, schuetzt die Aktion nicht - Server
    // Actions sind eigene Eintrittspunkte und werden auch ohne die Seite
    // aufgerufen.
    if (process.env.NODE_ENV === "production") notFound();
    if (!isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) notFound();

    const requested = String(formData.get("as") ?? "");
    // Nur bekannte Schluessel: Ein durchgereichter Parameter waere sonst eine
    // freie Mailadresse mit Umweg.
    const key: AccountKey = isAccountKey(requested) ? requested : "founder";
    const account = ACCOUNTS[key];

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: TEST_PASSWORD,
    });

    if (error) redirect(`/dev-login?error=1&as=${key}`);
    redirect(account.next);
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
          Zwei Seiten derselben Sache: Die Founderin entscheidet über Freigaben, die
          Advisorin fragt danach. Diese Seite gibt es nur, solange die App gegen eine
          lokale Datenbank läuft.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
            Anmeldung fehlgeschlagen. Gibt es das Testkonto schon? Es entsteht mit{" "}
            <code className="rounded bg-white px-1 py-0.5 text-xs">npm run dev:seed</code>.
          </p>
        ) : null}

        <div className="mt-5 grid gap-2">
          <form action={signIn}>
            <input type="hidden" name="as" value="founder" />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white"
            >
              Als Founderin anmelden (Nora)
            </button>
          </form>
          <form action={signIn}>
            <input type="hidden" name="as" value="advisor" />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-800"
            >
              Als Advisorin anmelden (Pia)
            </button>
          </form>
        </div>

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
