"use client";

type Option = {
  value: string;
  label: string;
  hint: string;
};

/**
 * Eine Auswahl, deren Optionen sich erklaeren - ohne die Seite zuzuschuetten.
 *
 * Vorher standen unter jedem der drei Felder die Erklaerungen als fester
 * Absatz. Drei Bloecke uebereinander, jeder mit einem Satz, den man nur beim
 * ersten Mal braucht: unuebersichtlich, und der eigentliche Inhalt ging darin
 * unter.
 *
 * Jetzt traegt jede Option ihren Satz selbst, sichtbar beim Zeigen mit der
 * Maus und beim Tastaturfokus. Der Kasten liegt absolut - er nimmt keinen
 * Platz im Fluss und kann die Anordnung deshalb nicht durcheinanderbringen.
 *
 * Auf dem Telefon gibt es kein Zeigen: Dort erscheint der Kasten beim
 * Antippen, weil das Antippen fokussiert. Und `aria-describedby` verbindet
 * Option und Erklaerung, damit eine Vorlesesoftware sie ohnehin mitliest -
 * unabhaengig davon, ob sie sichtbar ist.
 */
export function DiscoveryChoiceField({
  name,
  options,
  value,
}: {
  name: string;
  options: Option[];
  value: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        return (
          <div key={option.value} className="group relative">
            <input
              type="radio"
              id={id}
              name={name}
              value={option.value}
              defaultChecked={option.value === value}
              aria-describedby={`${id}-hint`}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className="flex min-h-11 cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 transition hover:border-slate-300 peer-checked:border-slate-900 peer-checked:bg-slate-900 peer-checked:font-semibold peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-amber-200"
            >
              {option.label}
            </label>

            {/* Liegt absolut und ohne Zeigerereignisse: So verschiebt er
                nichts und faengt keinen Klick ab, der der Option gilt. */}
            <div
              id={`${id}-hint`}
              role="tooltip"
              className="pointer-events-none invisible absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl bg-slate-900 px-4 py-3 text-xs leading-5 text-white opacity-0 shadow-[0_12px_30px_rgba(15,23,42,0.28)] transition duration-150 group-hover:visible group-hover:opacity-100 peer-focus-visible:visible peer-focus-visible:opacity-100"
            >
              {option.hint}
            </div>
          </div>
        );
      })}
    </div>
  );
}
