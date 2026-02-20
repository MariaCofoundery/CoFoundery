import Link from "next/link";

export default function BeispielAuswertungPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 md:px-8 md:py-14">
      <section className="rounded-3xl border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow)] backdrop-blur md:p-10">
        <p className="font-[var(--font-display)] text-xs tracking-[0.16em] text-[color:var(--ink-soft)]">
          Demo Auswertung
        </p>
        <h1 className="mt-3 text-3xl leading-tight text-[color:var(--ink)] md:text-5xl">
          Beispiel fuer einen spaeteren Vergleichsreport
        </h1>
        <p className="mt-5 leading-8 text-[color:var(--muted)]">
          Diese Seite ist als Platzhalter aktiv, damit der Link aus der Landingpage funktioniert.
          Im naechsten Schritt kann hier der echte Report aus Supabase-Daten gerendert werden.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <ReportBox
            title="Starke Uebereinstimmung"
            text="Vision, Ownership und Kommunikationsstil zeigen hohe Kompatibilitaet."
          />
          <ReportBox
            title="Kritischer Punkt"
            text="Unterschiedliches Tempo bei Entscheidungen sollte aktiv besprochen werden."
          />
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="rounded-xl bg-[color:var(--ink)] px-5 py-3 font-[var(--font-display)] text-[11px] tracking-[0.15em] text-white"
          >
            Zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}

function ReportBox({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-5">
      <h2 className="font-[var(--font-display)] text-lg">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{text}</p>
    </article>
  );
}
