import Link from "next/link";

/**
 * „Du lädst gerade in die bisherige Fassung ein."
 *
 * ---------------------------------------------------------------------------
 * DIE EINLADENDE PERSON ENTSCHEIDET, OHNE ES ZU WISSEN
 * ---------------------------------------------------------------------------
 *
 * Wer eine Einladung verschickt, legt damit fest, welchen Fragebogen die
 * andere Person ausfüllt — denn etwas Gemeinsames entsteht nur zwischen zwei
 * Menschen, die denselben ausgefüllt haben. Das ist eine Entscheidung, und
 * sie fiel bisher, ohne dass jemand sie bemerkt hätte.
 *
 * Der Hinweis steht VOR dem Formular und nicht danach: Nach dem Absenden ist
 * die Einladung draußen.
 */
export function InviteVersionNote() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
      <p className="text-sm font-medium text-slate-900">
        Du arbeitest noch mit der bisherigen Fassung.
      </p>
      <p className="mt-1 text-sm leading-7 text-slate-700">
        Wen du jetzt einlädst, führen wir deshalb auch dorthin — sonst hättet ihr am
        Ende zwei verschiedene Fragebögen und nichts, was sich nebeneinanderlegen
        lässt. Wenn du vorher die neue ausfüllst, gilt sie für euch beide.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/founder-alignment/profil" className="font-medium text-slate-900 underline">
          Zur neuen Fassung
        </Link>
      </p>
    </section>
  );
}
