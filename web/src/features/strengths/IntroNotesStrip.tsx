/**
 * Die Stichworte aus dem Intro („Beispiele“), die die Person am Anfang festgehalten hat.
 *
 * Sie standen bisher nur beim Wählen der Szenen (Runde 2). Beim Durchgehen der Szenen und in Runde 3 waren
 * sie nicht mehr zu sehen - man musste sich merken, was man sich vorgenommen hatte. Jetzt stehen sie in jedem
 * Schritt dabei, ruhig und klein, als Erinnerung und nicht als Aufgabe. Sie gehen nicht in die Auswertung
 * (sie liegen nur am Gespräch der Person), das ändert sich dadurch nicht.
 *
 * In der Szene (`onPick` gesetzt) sind sie antippbar: Ein Stichwort wandert in das Textfeld, in dem man gerade
 * schreibt. Mit `onAdd` kann man ein weiteres Stichwort ergänzen - auch dann, wenn am Anfang keines festgehalten wurde.
 * In Runde 3 stehen sie nur als Liste da.
 *
 * `tone="onPurple"` ist für die violette Seitenleiste der Szene, `tone="light"` für die helle Karte in Runde 3.
 */
type Copy = {
  title: string;
  hint?: string;
  /** Beschriftung eines Stichworts als Knopf, mit {note} schon eingesetzt. */
  take?: (note: string) => string;
  addLabel?: string;
  addPlaceholder?: string;
  add?: string;
};

export function IntroNotesStrip({
  notes,
  copy,
  tone,
  onPick,
  onAdd,
  adding = false,
  maxLength = 60,
}: {
  notes: string[];
  copy: Copy;
  tone: "onPurple" | "light";
  onPick?: (note: string) => void;
  onAdd?: (note: string) => void;
  adding?: boolean;
  maxLength?: number;
}) {
  if (notes.length === 0 && !onAdd) return null;
  const onPurple = tone === "onPurple";
  const chip = `rounded-full px-3 py-1 text-sm ${onPurple ? "bg-white/20 text-white" : "bg-[#efeafd] text-[#4b2bb8]"}`;
  function submitExtra(input: HTMLInputElement) {
    const text = input.value.trim();
    if (!text || !onAdd) return;
    onAdd(text);
    input.value = "";
  }
  return (
    <div
      className={`relative flex flex-col gap-2 rounded-2xl px-4 py-3.5 ${onPurple ? "bg-white/10 text-white" : "border border-[#e4dcfb] bg-[#faf8ff] text-[#14152b]"}`}
      data-intro-notes
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${onPurple ? "text-[#dcd3fb]" : "text-[#5b36d4]"}`}>{copy.title}</p>
      {notes.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {notes.map((note) => (
            <li key={note}>
              {onPick ? (
                <button
                  type="button"
                  onClick={() => onPick(note)}
                  aria-label={copy.take?.(note) ?? note}
                  className={`${chip} min-h-9 cursor-pointer text-left transition hover:bg-white hover:text-[#3f1fb0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white`}
                >
                  {note}
                </button>
              ) : (
                <span className={`inline-block ${chip}`}>{note}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {copy.hint ? <p className={`text-[13px] ${onPurple ? "text-[#dcd3fb]" : "text-[#4a4d68]"}`}>{copy.hint}</p> : null}
      {onAdd ? (
        // Kein <form>: Die Leiste steht im Formular der Szene, und Formulare lassen sich nicht verschachteln. Enter im
        // Feld fügt das Stichwort hinzu und schickt deshalb nicht die ganze Szene ab.
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="scene-extra-note">{copy.addLabel}</label>
          <input
            id="scene-extra-note"
            type="text"
            maxLength={maxLength}
            placeholder={copy.addPlaceholder}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              submitExtra(event.currentTarget);
            }}
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/35 bg-white/10 px-3 text-sm text-white placeholder:text-[#dcd3fb]"
          />
          <button
            type="button"
            disabled={adding}
            onClick={(event) => {
              const input = event.currentTarget.parentElement?.querySelector("input");
              if (input) submitExtra(input);
            }}
            className="min-h-10 rounded-xl bg-white px-3.5 text-sm font-semibold text-[#3f1fb0] disabled:opacity-60"
          >
            {copy.add}
          </button>
        </div>
      ) : null}
    </div>
  );
}
