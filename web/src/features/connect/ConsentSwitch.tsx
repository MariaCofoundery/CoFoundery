/**
 * Ein Schalter fuer eine Zustimmung (Entwurf 09.11.2026): Titel, ein Satz, was er bewirkt, darunter was bei "aus" gilt.
 * Technisch bleibt es ein Kaestchen im Formular (`name`, `value="yes"`); Zustimmungen sind getrennt und werden hier
 * nie miteinander verknuepft.
 */
export function ConsentSwitch({
  name,
  title,
  effect,
  offEffect,
  defaultChecked,
}: {
  name: string;
  title: string;
  effect: string;
  offEffect: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 p-4">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-[13.5px] leading-6 text-slate-700">{effect}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-600">{offEffect}</span>
      </span>
      <input type="checkbox" name={name} value="yes" defaultChecked={defaultChecked} role="switch" className="peer sr-only" />
      <span aria-hidden="true" className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-slate-400 p-[3px] transition peer-checked:bg-emerald-700 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-focus-visible:ring-offset-2 after:block after:h-7 after:w-7 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-6" />
    </label>
  );
}
