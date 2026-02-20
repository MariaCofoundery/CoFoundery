import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-[0.06em] text-slate-900">Impressum</h1>
        <Link
          href="/"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Zurück
        </Link>
      </header>

      <section className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-8 text-sm leading-7 text-slate-700">
        <p>
          Angaben gemäß § 5 DDG
        </p>

        <div>
          <p className="font-semibold text-slate-900">Maria Schulz</p>
          <p>Am Juliusturm 89, 13597 Berlin</p>
          <p>Deutschland</p>
        </div>

        <div>
          <p className="font-semibold text-slate-900">Kontakt</p>
          <p>E-Mail: Business.mariaschulz@gmail.com</p>
        </div>

        <div>
          <p className="font-semibold text-slate-900">Hinweis</p>
          <p>Dieses Projekt befindet sich aktuell in einer privaten, nicht-kommerziellen Testphase.</p>
        </div>
      </section>
    </main>
  );
}
