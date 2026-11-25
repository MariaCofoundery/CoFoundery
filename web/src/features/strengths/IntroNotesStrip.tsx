/**
 * Die Stichworte aus dem Intro („Beispiele“), die die Person am Anfang festgehalten hat.
 *
 * Sie standen bisher nur beim Wählen der Szenen (Runde 2). Beim Durchgehen der Szenen und in Runde 3 waren
 * sie nicht mehr zu sehen - man musste sich merken, was man sich vorgenommen hatte. Jetzt stehen sie in jedem
 * Schritt dabei, ruhig und klein, als Erinnerung und nicht als Aufgabe. Sie gehen nicht in die Auswertung
 * (sie liegen nur am Gespräch der Person), das ändert sich dadurch nicht.
 *
 * `tone="onPurple"` ist für die violette Seitenleiste der Szene, `tone="light"` für die helle Karte in Runde 3.
 */
export function IntroNotesStrip({
  notes,
  title,
  hint,
  tone,
}: {
  notes: string[];
  title: string;
  hint?: string;
  tone: "onPurple" | "light";
}) {
  if (notes.length === 0) return null;
  const onPurple = tone === "onPurple";
  return (
    <div
      className={`relative flex flex-col gap-2 rounded-2xl px-4 py-3.5 ${onPurple ? "bg-white/10 text-white" : "border border-[#e4dcfb] bg-[#faf8ff] text-[#14152b]"}`}
      data-intro-notes
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${onPurple ? "text-[#dcd3fb]" : "text-[#5b36d4]"}`}>{title}</p>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {notes.map((note) => (
          <li key={note} className={`rounded-full px-3 py-1 text-sm ${onPurple ? "bg-white/20 text-white" : "bg-[#efeafd] text-[#4b2bb8]"}`}>
            {note}
          </li>
        ))}
      </ul>
      {hint ? <p className={`text-[13px] ${onPurple ? "text-[#dcd3fb]" : "text-[#4a4d68]"}`}>{hint}</p> : null}
    </div>
  );
}
