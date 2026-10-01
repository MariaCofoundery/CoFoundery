import type { ReactNode } from "react";

/**
 * Eingeklappt, bis jemand nachsehen will.
 *
 * GEWUENSCHT AM 24.09.2026: "Sachen, die man selbst beantwortet hat, die
 * brauchen jetzt da nicht mehr so ausfuehrlich stehen. Einfach nur die
 * Zusammenfassung, und dann kann man, wenn man will, seine eigenen Antworten
 * noch mal ausklappen."
 *
 * WAS EINGEKLAPPT WIRD UND WAS NICHT: Eingeklappt gehoert, was die Person
 * selbst eingegeben hat oder was eine Ausfuehrung davon ist - die eigene
 * Bereichsliste, die langen Ableitungen aus dem Fragebogen. Offen bleibt die
 * Zusammenfassung. Wer sein eigenes Profil ansieht, will sehen, was dabei
 * herausgekommen ist; was er selbst geantwortet hat, weiss er.
 *
 * NATIVES `details`, KEIN ZUSTAND IN REACT. Damit funktioniert es ohne
 * JavaScript und die Suche im Browser findet auch eingeklappten Text.
 *
 * ---------------------------------------------------------------------------
 * GEDRUCKT WIRD HIER NICHTS MEHR - SEIT DEM 01.10.2026
 * ---------------------------------------------------------------------------
 *
 * Bis dahin klappte ein Bauteil (`OpenDetailsForPrint`) beim Drucken alle
 * diese Kaesten auf, damit in der weitergegebenen Fassung nicht genau der
 * Teil fehlte, den man weitergeben wollte.
 *
 * Es ist entfallen, weil die Zusage anders eingeloest wird: Die beiden
 * Druckfassungen liegen unter `/me/profile/print` und haben gar keine
 * Aufklapper. Damit haengt ihr Inhalt auch nicht mehr davon ab, was jemand
 * auf der Leseseite vorher angeklickt hatte.
 *
 * `data-profile-details` bleibt als Merkmal stehen: Es kostet nichts und
 * macht diese Kaesten auffindbar, ohne fremde `details` mitzunehmen.
 */
export function ProfileDetails({
  summary,
  hint,
  children,
  className = "",
}: {
  summary: string;
  /** Was drin steht, in einem Halbsatz - sonst klickt niemand. */
  hint?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      data-profile-details
      className={`group rounded-2xl border border-slate-200 bg-white/70 print:border-none print:bg-transparent ${className}`}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
        {/* Der Pfeil dreht sich - das ist die einzige Bewegung hier, und sie
            sagt, dass der Kasten auf- und wieder zugeht. */}
        <span
          aria-hidden
          className="text-slate-400 transition-transform group-open:rotate-90 motion-reduce:transition-none"
        >
          ▸
        </span>
        <span>{summary}</span>
        {hint ? (
          <span className="ml-auto hidden text-xs font-normal text-slate-500 sm:inline">
            {hint}
          </span>
        ) : null}
      </summary>
      <div className="border-t border-slate-200 px-4 py-4 print:border-none print:px-0">
        {children}
      </div>
    </details>
  );
}
