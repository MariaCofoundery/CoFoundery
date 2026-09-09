"use client";

import { useTranslations } from "next-intl";
import type { DictationCopy, DictationErrorKey, DictationHandle } from "./useDictation";

/**
 * Der sichtbare Teil des Diktats: Mikrofonknopf, Statuspunkt, eine Zeile Text.
 *
 * Absichtlich zurueckhaltend. Diktieren ist ein Angebot, keine Aufforderung -
 * wer tippen will, soll das Feld unveraendert vorfinden. Deshalb sitzt der
 * Knopf im Feld statt darunter und nichts blinkt, solange nichts laeuft.
 */

/** Holt die geteilte Diktat-Copy. Ein Namensraum fuer alle Felder. */
export function useDictationCopy(): DictationCopy {
  const t = useTranslations("common.dictation");
  return {
    listening: t("listening"),
    accepted: t("accepted"),
    startFailed: t("startFailed"),
    restartFailed: t("restartFailed"),
    unsupported: t("unsupported"),
    error: (key: DictationErrorKey) => t(`errors.${key}`),
  };
}

export function DictationButton({ dictation }: { dictation: DictationHandle }) {
  const t = useTranslations("common.dictation");
  // "unknown" heisst: der Client hat noch nicht geprueft. Dann den Knopf
  // zeigen - ihn nachtraeglich einzublenden waere ein Sprung im Layout.
  if (dictation.supportState === "unsupported") return null;

  return (
    <button
      type="button"
      onClick={dictation.toggle}
      className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
        dictation.active
          ? "border-[color:var(--brand-primary)]/30 bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      }`}
      aria-label={dictation.active ? t("stop") : t("start")}
      title={dictation.active ? t("stop") : t("start")}
    >
      <MicIcon active={dictation.active} />
    </button>
  );
}

/**
 * Zeigt, dass das Mikrofon offen ist - auch in der Pause zwischen zwei Saetzen,
 * in der die Browser-Erkennung sich kurz beendet. Ohne diesen Unterschied
 * (Punkt in Markenfarbe gegen Bernstein) wirkt jede Denkpause wie ein Abbruch.
 */
export function DictationBadge({ dictation }: { dictation: DictationHandle }) {
  if (!dictation.active && dictation.status !== "paused") return null;

  return <DictationBadgeChrome active={dictation.active} />;
}

function DictationBadgeChrome({ active }: { active: boolean }) {
  const t = useTranslations("common.dictation");
  return (
    <div className="pointer-events-none absolute left-4 top-3 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/92 px-2.5 py-1 text-[11px] text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <span
        className={`h-2 w-2 rounded-full ${active ? "bg-[color:var(--brand-primary)]" : "bg-amber-400"}`}
      />
      <span>{active ? t("recording") : t("waiting")}</span>
    </div>
  );
}

/**
 * Die Statuszeile unter dem Feld. Im Browser ohne Erkennung steht dort einmal,
 * dass Diktieren hier nicht geht - statt eines Knopfs, der nichts tut.
 */
export function DictationMessage({ dictation }: { dictation: DictationHandle }) {
  const t = useTranslations("common.dictation");

  if (dictation.supportState === "unsupported") {
    return <p className="mt-2 text-xs leading-6 text-slate-500">{t("unsupportedLong")}</p>;
  }

  if (!dictation.message) return null;

  return (
    <p
      className={`mt-2 text-xs leading-6 ${
        dictation.status === "error"
          ? "text-rose-600"
          : dictation.active
            ? "text-[color:var(--brand-primary)]"
            : "text-slate-500"
      }`}
    >
      {dictation.message}
    </p>
  );
}

export function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </svg>
  );
}
