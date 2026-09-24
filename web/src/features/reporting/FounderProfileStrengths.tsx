import type { PersonStrength } from "@/features/capability/strengthData";

/**
 * Deine Arbeitsweise - im Gesamtbild.
 *
 * NACHGETRAGEN AM 24.09.2026. Maria: "Wo sehe ich das mit den Soft Skills?"
 * Antwort war: auf der Profilseite, aber nicht im Gesamtbild - und das war
 * inkonsequent. Das Gesamtbild ist die Seite, die man weitergibt; wenn
 * Arbeitsweisen irgendwo hingehören, dann dorthin.
 *
 * BEIDE BLICKE STEHEN DA, der eigene und die vermutete Außensicht. Das ist der
 * Ertrag des Perspektivwechsels: "manchmal / oft" sagt mehr als eine Zahl, und
 * wer es liest, sieht sofort, worüber zu sprechen wäre.
 *
 * DER HINWEIS AUF DEN UNTERSCHIED STEHT HIER NICHT. Auf der eigenen
 * Profilseite ist "hier siehst du dich anders, als du andere vermutest" eine
 * Einladung zum Nachdenken. In einer Fassung, die man weitergibt, läse sich
 * derselbe Satz wie ein Befund über einen Menschen - und das ist er nicht.
 */
export function FounderProfileStrengths({
  strengths,
  copy,
}: {
  strengths: PersonStrength[];
  copy: {
    title: string;
    intro: string;
    self: string;
    reflected: (who: string) => string;
    frequency: (value: string) => string;
    group: (value: string) => string;
    unanswered: string;
  };
}) {
  if (strengths.length === 0) return null;

  return (
    <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
      <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">{copy.intro}</p>

      <ul className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
        {strengths.map((strength) => (
          <li key={strength.id} className="py-3">
            <p className="text-sm font-medium text-slate-950">{strength.statement}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {copy.self}:{" "}
              {strength.selfFrequency ? copy.frequency(strength.selfFrequency) : copy.unanswered}
              {strength.reflectedFrequency && strength.reflectedWho ? (
                <>
                  {" · "}
                  {copy.reflected(copy.group(strength.reflectedWho))}:{" "}
                  {copy.frequency(strength.reflectedFrequency)}
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
