"use client";

import { useTranslations } from "next-intl";

type ForcedChoiceOption = {
  id: string;
  question_id: string;
  label: string;
  value: string;
  sort_order: number;
};

type Props = {
  options: ForcedChoiceOption[];
  statementA?: string | null;
  statementB?: string | null;
  selectedChoiceId?: string;
  selectedValue?: string;
  disabled?: boolean;
  missingChoicesMessage: string;
  onSelect: (choice: ForcedChoiceOption) => void;
};

function isSelected(
  option: ForcedChoiceOption,
  selectedChoiceId?: string,
  selectedValue?: string
) {
  if (selectedChoiceId) {
    return selectedChoiceId === option.id;
  }
  return selectedValue === option.value;
}

export function ForcedChoiceQuestion({
  options,
  statementA,
  statementB,
  selectedChoiceId,
  selectedValue,
  disabled = false,
  missingChoicesMessage,
  onSelect,
}: Props) {
  const t = useTranslations("assessment.forcedChoice");

  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {missingChoicesMessage}
      </p>
    );
  }

  if (options.length < 5) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4">
        <p className="text-sm text-amber-900">
          {t("tooFewOptions")}
        </p>
        <div className="mt-4 grid gap-3">
          {options.map((option) => {
            const active = isSelected(option, selectedChoiceId, selectedValue);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option)}
                disabled={disabled}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                } disabled:opacity-60`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const scaleMeta = [
    { longLabel: t("scale.aStrong") },
    { longLabel: t("scale.aSoft") },
    { longLabel: t("scale.both") },
    { longLabel: t("scale.bSoft") },
    { longLabel: t("scale.bStrong") },
  ];

  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] p-5 sm:p-6">
      {/* -------------------------------------------------------------------
          GEFUNDEN AM 20.09.2026 bei der Handy-Durchsicht.

          Hier stand `grid-cols-5` ohne Umbruchpunkt - fuenf Spalten auch auf
          einem Telefon. Rechnung fuer 360 Pixel Breite: 320 nach dem
          Innenabstand, minus vier Luecken, geteilt durch fuenf sind 57 Pixel
          je Knopf; davon gehen 32 fuer px-4 ab. Bleiben 25 Pixel fuer "beide
          gleich" - zwoelf Zeichen. Die Beschriftung zerfiel.

          Und das ist die Kernflaeche des Produkts: Hier beantworten Menschen
          die Fragen.

          Gestapelt auf dem Telefon, fuenf Spalten ab sm. Dasselbe Muster
          benutzt dieser Baustein weiter oben fuer die andere Fragenart schon -
          volle Breite, linksbuendig.

          NICHT geaendert: die Reihenfolge. Skala vor Aussagen ist eine
          Entscheidung des Fragebogens, nicht ein Layoutfehler, und in welcher
          Folge jemand liest, kann Antworten beeinflussen.
          ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-3">
        {options.map((option, idx) => {
          const active = isSelected(option, selectedChoiceId, selectedValue);
          const meta = scaleMeta[idx];

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option)}
              disabled={disabled}
              aria-pressed={active}
              aria-label={meta.longLabel}
              className={`min-h-11 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 sm:text-center ${
                active
                  ? idx < 2
                    ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                    : idx > 2
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                      : "border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/70 hover:shadow-[0_8px_22px_rgba(124,58,237,0.08)]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span>{meta.longLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Die Aussagen ebenso: Zwei Spalten auf einem Telefon sind zwei mal
          140 Pixel fuer ganze Saetze.

          WICHTIG beim Stapeln: Welche Aussage A und welche B ist, stand allein
          in der POSITION - links und rechts. Uebereinander ist diese Angabe
          weg, und die Knoepfe darueber heissen "A deutlich" und "B deutlich".
          Deshalb tragen die Aussagen auf dem Telefon eine Kennung. Ab sm
          bleibt es bei der Position; dort ist die Zuordnung eindeutig, und
          eine funktionierende Ansicht wird nicht umgebaut. */}
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200/80 pt-5 sm:grid-cols-2 sm:gap-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 sm:hidden">
            {t("scale.statementA")}
          </p>
          <p className="mt-1 text-sm leading-7 text-slate-800 sm:mt-0">{statementA ?? ""}</p>
        </div>
        <div className="min-w-0 sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 sm:hidden">
            {t("scale.statementB")}
          </p>
          <p className="mt-1 text-sm leading-7 text-slate-800 sm:mt-0">{statementB ?? ""}</p>
        </div>
      </div>
    </div>
  );
}
