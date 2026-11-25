import type { SceneId } from "@/features/strengths/strengthsDiscoverGuide";

/**
 * Zwölf kleine geometrische Bilder, je eines pro Szene (Entwurf vom 25.11.2026) - statt Symbolen aus einer Icon-Sammlung.
 * Reine Formen aus festen Texten (keine Eingaben der Person), gefärbt über drei Farben, die der Aufrufer setzt.
 */
const SHAPES: Record<SceneId, string> = {
  sc_unsure: `<circle style="fill:var(--vg-a)" cx="12" cy="46" r="5"/><circle style="fill:var(--vg-a)" cx="32" cy="46" r="5"/><circle style="fill:var(--vg-b)" cx="52" cy="46" r="5"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M12 39Q22 18 32 39"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.5 4.5" d="M32 39Q42 18 52 39"/>`,
  sc_nobody: `<circle style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.5 4.5" cx="17" cy="32" r="11"/><circle style="fill:var(--vg-c)" cx="47" cy="32" r="11"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M31 32h6M34 29l3 3-3 3"/>`,
  sc_fast_decision: `<path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M10 52L30 34"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M30 34L53 13" style="stroke-width:3.4"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.5 4.5" d="M30 34L54 50"/><circle style="fill:var(--vg-c)" cx="53" cy="13" r="5"/><circle style="fill:var(--vg-b)" cx="54" cy="50" r="4"/>`,
  sc_stuck_problem: `<path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M8 40c3-15 10-17 13-8s9 8 8-3-9-9-10 0"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M34 36h14"/><circle style="fill:var(--vg-c)" cx="53" cy="36" r="5"/>`,
  sc_from_zero: `<path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M8 52h48"/><rect style="fill:var(--vg-b)" x="12" y="42" width="10" height="10" rx="2"/><rect style="fill:var(--vg-b)" x="27" y="31" width="10" height="21" rx="2"/><rect style="fill:var(--vg-c)" x="42" y="16" width="10" height="36" rx="2"/>`,
  sc_convinced: `<circle style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" cx="21" cy="25" r="10"/><circle style="fill:var(--vg-c)" cx="44" cy="40" r="10"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.5 4.5" d="M29 30l7 5"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M17 25l3 3 5-6"/>`,
  sc_uncomfortable: `<path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M12 14h40a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H30L20 54V44h-8a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M32 21v11"/><circle style="fill:var(--vg-c)" cx="32" cy="37.5" r="2"/>`,
  sc_helped_grow: `<path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M8 54h12V44h12V34h12V24h12"/><circle style="fill:var(--vg-b)" cx="26" cy="36" r="4.5"/><circle style="fill:var(--vg-c)" cx="50" cy="14" r="5.5"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.5 4.5" d="M29 32Q38 20 46 15"/>`,
  sc_connected: `<circle style="fill:var(--vg-a)" cx="12" cy="46" r="6"/><circle style="fill:var(--vg-a)" cx="52" cy="46" r="6"/><circle style="fill:var(--vg-c)" cx="32" cy="16" r="7"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M16 41L27 22M48 41L37 22"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.5 4.5" d="M19 46h26"/>`,
  sc_learned_fast: `<path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M10 52h14M10 40h26M10 28h38"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round" d="M44 12l6 6-6 6"/><circle style="fill:var(--vg-c)" cx="53" cy="48" r="5"/>`,
  sc_order: `<rect style="fill:var(--vg-b)" x="8" y="13" width="15" height="5" rx="2.5" transform="rotate(-18 15 16)"/><rect style="fill:var(--vg-b)" x="11" y="29" width="15" height="5" rx="2.5" transform="rotate(14 18 32)"/><rect style="fill:var(--vg-b)" x="8" y="45" width="15" height="5" rx="2.5" transform="rotate(-8 15 48)"/><rect style="fill:var(--vg-c)" x="36" y="13" width="20" height="5" rx="2.5"/><rect style="fill:var(--vg-c)" x="36" y="29" width="20" height="5" rx="2.5"/><rect style="fill:var(--vg-c)" x="36" y="45" width="20" height="5" rx="2.5"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.5 4.5" d="M28 31h5"/>`,
  sc_asked_for: `<circle style="fill:var(--vg-c)" cx="32" cy="32" r="10"/><circle style="fill:var(--vg-a)" cx="10" cy="13" r="3.4"/><circle style="fill:var(--vg-a)" cx="54" cy="12" r="3.4"/><circle style="fill:var(--vg-a)" cx="8" cy="50" r="3.4"/><circle style="fill:var(--vg-a)" cx="56" cy="51" r="3.4"/><circle style="fill:var(--vg-a)" cx="32" cy="59" r="3"/><path style="fill:none;stroke:var(--vg-a);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.5 4.5" d="M14 16l11 10M50 15L39 25M12 47l11-9M52 48L40 39M32 55V43"/>`,
};

export function SceneVignette({ id, selected }: { id: SceneId; selected: boolean }) {
  const colors = selected
    ? { "--vg-a": "#fff", "--vg-b": "#c9bbf7", "--vg-c": "#fff" }
    : { "--vg-a": "#14152b", "--vg-b": "#c9bbf7", "--vg-c": "#6d49e0" };
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`block size-16 flex-none rounded-[18px] border p-[7px] transition-colors ${selected ? "border-[#6d49e0] bg-[#6d49e0]" : "border-[#e6e4f2] bg-white"}`}
      style={colors as React.CSSProperties}
      dangerouslySetInnerHTML={{ __html: SHAPES[id] }}
    />
  );
}
