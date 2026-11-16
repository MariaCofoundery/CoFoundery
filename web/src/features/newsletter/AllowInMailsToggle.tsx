import { setAllowInMailsAction } from "@/features/newsletter/mailPermissionActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

type T = (key: string, values?: Record<string, string | number>) => string;

/** Ein Schalter fuer die Besitzerin: darf dieser Eintrag, ohne Namen, in einem Newsletter erscheinen? Standard: nein. */
export function AllowInMailsToggle({ kind, id, allowed, t }: { kind: "listing" | "problem"; id: string; allowed: boolean; t: T }) {
  return (
    <section data-allow-in-mails className="rounded-2xl border border-[#d9dcec] bg-white p-4" aria-labelledby={`mails-${id}`}>
      <h2 id={`mails-${id}`} className="text-base font-semibold text-[#0b1f3a]">{t("mails.title")}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{t(allowed ? "mails.on" : "mails.off")}</p>
      <form action={setAllowInMailsAction} className="mt-3">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="allow" value={allowed ? "0" : "1"} />
        <SubmitButton label={t(allowed ? "mails.stop" : "mails.allow")} pendingLabel="…" className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold" />
      </form>
    </section>
  );
}
