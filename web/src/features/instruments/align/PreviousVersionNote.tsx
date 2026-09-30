import Link from "next/link";

/**
 * „Das ist die bisherige Fassung."
 *
 * ---------------------------------------------------------------------------
 * WER IM ALTEN BOGEN SITZT, SOLL ES WISSEN
 * ---------------------------------------------------------------------------
 *
 * Eine Einladung führt dorthin, wo die einladende Person arbeitet — wer mit
 * der bisherigen Fassung einlädt, führt die andere Person ebenfalls dorthin.
 * Das ist richtig so, sonst hätten die beiden am Ende nichts Gemeinsames.
 * Aber es darf nicht unbemerkt passieren: Man füllt sonst einen Fragebogen
 * aus und erfährt danach, dass es einen neueren gibt.
 *
 * KEIN GROSSER KNOPF. Der Hinweis zieht niemanden hier heraus — wer angefangen
 * hat, soll fertig werden können. Er sagt, was Sache ist, und nennt den Weg
 * für danach.
 */
export function PreviousVersionNote({ inviterName }: { inviterName?: string | null }) {
  return (
    <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
      <p className="text-sm font-medium text-slate-900">Das ist die bisherige Fassung.</p>
      <p className="mt-1 text-sm leading-7 text-slate-700">
        {inviterName
          ? `${inviterName} arbeitet damit — deshalb führt die Einladung hierher. So habt ihr am Ende etwas Gemeinsames.`
          : "Es gibt inzwischen eine neue. Deine Antworten hier bleiben erhalten, auch wenn du später umsteigst."}{" "}
        <Link href="/founder-alignment/profil" className="underline">
          Die neue Fassung ansehen
        </Link>
      </p>
    </section>
  );
}
