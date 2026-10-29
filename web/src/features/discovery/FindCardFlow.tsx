"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type CardId = "bring" | "time" | "idea" | "search" | "seeking";
type IssueKey = "displayName" | "headline" | "ownRoles" | "seekingRoles" | "availability" | "commitment" | "ventureStage" | "ventureGoal";

const ISSUE_CARD: Record<Exclude<IssueKey, "displayName" | "headline">, CardId> = {
  ownRoles: "bring",
  availability: "time",
  commitment: "time",
  ventureStage: "idea",
  ventureGoal: "idea",
  seekingRoles: "seeking",
};

type Copy = {
  back: string;
  next: string;
  /** Mit den Platzhaltern {current} und {total}. */
  stepOf: string;
  cardTitles: Record<CardId | "publish", string>;
  publishTitle: string;
  missingTitle: string;
  missingNote: string;
  allSet: string;
  fix: string;
  identityFix: string;
  issueLabels: Record<IssueKey, string>;
};

/**
 * Das Find-Profil als Karten: eine Frage pro Schritt.
 *
 * DAS FORMULAR BLEIBT EINS. Alle Felder stehen die ganze Zeit im Dokument, die
 * nicht gezeigten Karten sind nur versteckt (`hidden`) - ein verstecktes Feld
 * wird trotzdem mitgeschickt. Damit sind Speichern, Veroeffentlichen und alle
 * Pruefungen dieselben wie beim langen Formular; nur die Darstellung ist neu.
 * Das Formular traegt `noValidate`: Der Browser koennte sonst auf ein
 * verstecktes Pflichtfeld nicht springen und still nichts abschicken. Geprueft
 * wird auf dem Server.
 *
 * DIE PFLICHT-BOX (letzte Karte) liest die Felder live aus dem Formular und
 * sagt, was zum Veroeffentlichen noch fehlt - mit Sprung zur Karte. Solange
 * etwas fehlt, ist "Veroeffentlichen" gesperrt. Die Regeln sind dieselben wie
 * `getDiscoveryProfilePublishIssues`; der Server prueft sie unabhaengig davon
 * noch einmal, die Box ist nur frueher da.
 */
export function FindCardFlow({
  cards,
  initialStep,
  publishStatus,
  identityIssues,
  saveNode,
  publishNode,
  helpNode,
  copy,
}: {
  cards: { id: CardId; node: ReactNode }[];
  initialStep: number;
  publishStatus: string;
  identityIssues: ("displayName" | "headline")[];
  saveNode: ReactNode;
  publishNode: ReactNode;
  helpNode: ReactNode;
  copy: Copy;
}) {
  const total = cards.length + 1;
  const [index, setIndex] = useState(Math.min(Math.max(initialStep, 0), total - 1));
  const root = useRef<HTMLDivElement>(null);
  const [formIssues, setFormIssues] = useState<IssueKey[]>([]);
  const isPublish = index === cards.length;

  // Die Felder lesen, solange die letzte Karte offen ist.
  useEffect(() => {
    if (!isPublish) return;
    const form = root.current?.closest("form");
    if (!form) return;
    const read = () => {
      const data = new FormData(form);
      const issues: IssueKey[] = [];
      if (data.getAll("ownRoles").length === 0) issues.push("ownRoles");
      if (data.getAll("seekingRoles").length === 0) issues.push("seekingRoles");
      if (String(data.get("availabilityHoursPerWeek") ?? "").trim() === "") issues.push("availability");
      if (String(data.get("commitmentLevel") ?? "exploring") === "exploring") issues.push("commitment");
      if (String(data.get("ventureStage") ?? "undecided") === "undecided") issues.push("ventureStage");
      if (String(data.get("ventureGoal") ?? "undecided") === "undecided") issues.push("ventureGoal");
      setFormIssues(issues);
    };
    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, [isPublish]);

  const missing: IssueKey[] = [...identityIssues, ...formIssues];

  function go(to: number) {
    setIndex(Math.max(0, Math.min(total - 1, to)));
    root.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  return (
    <div ref={root} className="grid gap-5 scroll-mt-24">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-slate-500">
            {copy.stepOf.replace("{current}", String(index + 1)).replace("{total}", String(total))}
          </span>
        </div>
        {/* Eine Leiste statt Prozente: Sie zeigt nur, wo man in der Reihe steht. */}
        <div className="h-[5px] overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-sky-500 transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <nav aria-label={copy.publishTitle} className="flex flex-wrap gap-1.5">
          {[...cards.map((card) => card.id), "publish" as const].map((id, position) => (
            <button
              key={id}
              type="button"
              aria-current={position === index ? "step" : undefined}
              onClick={() => go(position)}
              className={`min-h-9 rounded-xl px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                position === index ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {copy.cardTitles[id]}
            </button>
          ))}
        </nav>
      </div>

      {cards.map((card, position) => (
        <div key={card.id} hidden={position !== index} className="min-h-[16rem]">
          {card.node}
        </div>
      ))}

      <div hidden={!isPublish} className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-950">{copy.publishTitle}</h2>
        {publishStatus !== "active" ? (
          missing.length > 0 ? (
            <div className="grid gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[.08em] text-amber-900">{copy.missingTitle}</p>
              <ul className="grid gap-1.5 text-sm text-amber-950">
                {missing.map((issue) => (
                  <li key={issue} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>{copy.issueLabels[issue]}</span>
                    {issue === "displayName" || issue === "headline" ? (
                      <a href="#identity" className="font-bold text-violet-800 underline underline-offset-2">{copy.identityFix}</a>
                    ) : (
                      <button type="button" onClick={() => go(cards.findIndex((card) => card.id === ISSUE_CARD[issue]))} className="font-bold text-violet-800 underline underline-offset-2">
                        {copy.fix}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs leading-5 text-amber-900">{copy.missingNote}</p>
            </div>
          ) : (
            <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{copy.allSet}</p>
          )
        ) : null}
        {/* Speichern steht zuerst - die Eingabetaste loest den ersten Knopf im Formular aus. */}
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          {saveNode}
          <fieldset disabled={missing.length > 0} className="contents">
            {publishNode}
          </fieldset>
        </div>
        {helpNode}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:text-slate-950 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
          {copy.back}
        </button>
        {!isPublish ? (
          <button type="button" onClick={() => go(index + 1)} className="brand-cta inline-flex min-h-11 items-center rounded-2xl px-6 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
            {copy.next}
          </button>
        ) : null}
      </div>
    </div>
  );
}
