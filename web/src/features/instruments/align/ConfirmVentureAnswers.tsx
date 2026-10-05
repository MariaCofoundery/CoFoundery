"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReadoutEntry } from "@/features/instruments/v21/readoutV21";

/**
 * „Das hattest du damals gesagt - übernehmen oder ändern?“
 *
 * ---------------------------------------------------------------------------
 * WANN DAS ERSCHEINT
 * ---------------------------------------------------------------------------
 *
 * Wenn jemand allein angefangen hat und jetzt eine Verbindung entsteht.
 * Maria am 29.09.2026: „Dass man da auch noch mal gezeigt bekommt: hey, das
 * ist die Grundlage, das hast du angegeben, nimm das oder verändere das
 * vielleicht noch mal.“
 *
 * ---------------------------------------------------------------------------
 * ZUERST DAS, WAS ALTERT
 * ---------------------------------------------------------------------------
 *
 * Alle 36 Fragen noch einmal vorzulegen wäre eine zweite Runde Fragebogen -
 * und die macht niemand. Deshalb zuerst die Zahlen, Beträge und Termine:
 * Stunden pro Woche können sich ändern, „wie sprichst du Einwände an“ nicht,
 * weil ein Quartal vergangen ist.
 *
 * Daneben ein Knopf für alles. Die Vorauswahl ist eine Hilfe und keine
 * Entscheidung darüber, was jemand ansehen darf.
 *
 * ---------------------------------------------------------------------------
 * ES WIRD NICHTS ÜBERSCHRIEBEN
 * ---------------------------------------------------------------------------
 *
 * „So übernehmen“ ändert keine Antwort - es hält nur fest, dass die Person
 * daraufgeschaut hat. Wer nichts tut, dessen Antworten gelten trotzdem
 * weiter; dieser Schritt ist eine Gelegenheit und keine Bedingung.
 */

export type ConfirmEntry = {
  itemId: string;
  prompt: string;
  /** Was damals geantwortet wurde - oder null, wenn die Frage offen blieb. */
  entry: ReadoutEntry | null;
};

type Props = {
  ventureName: string | null;
  partnerLabel: string;
  answeredAt: string | null;
  ages: ConfirmEntry[];
  keeps: ConfirmEntry[];
  onConfirm: () => void;
  confirming?: boolean;
  /** Wohin "Etwas ändern" fuehrt: der aktuelle Vorhaben-Fragebogen dieses Vorhabens. */
  editHref: string;
};

export function ConfirmVentureAnswers({
  ventureName, partnerLabel, answeredAt, ages, keeps, onConfirm, confirming, editHref,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const gezeigt = showAll ? [...ages, ...keeps] : ages;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {ventureName ?? "Dein Vorhaben"}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">
        Das hast du zu diesem Vorhaben angegeben
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {partnerLabel} ist jetzt dabei. Bevor eure Antworten nebeneinanderstehen:
        Schau kurz drüber, ob das noch stimmt.
        {answeredAt && (
          <> Du hast das am {new Date(answeredAt).toLocaleDateString("de-DE")} ausgefüllt.</>
        )}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {showAll
          ? "Alle Angaben zu diesem Vorhaben."
          : "Zuerst die Angaben, die sich mit der Zeit ändern — Stunden, Beträge, Termine."}
      </p>

      <ul className="mt-5 space-y-3">
        {gezeigt.map((entry) => (
          <li key={entry.itemId} className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{entry.prompt}</p>
            <p className="mt-1 text-base text-slate-900">
              {entry.entry?.missing ? (
                <span className="text-slate-600">{entry.entry.missing.label}</span>
              ) : (
                <Short entry={entry.entry} />
              )}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={confirming}
          onClick={onConfirm}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {confirming ? "einen Moment…" : "So übernehmen"}
        </button>

        <Link
          href={editHref}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800"
        >
          Etwas ändern
        </Link>

        {!showAll && keeps.length > 0 && (
          <button
            type="button"
            className="text-sm text-slate-600 underline"
            onClick={() => setShowAll(true)}
          >
            Alle {ages.length + keeps.length} Angaben ansehen
          </button>
        )}
      </div>

      {/* WER NICHTS TUT, VERLIERT NICHTS. Sonst waere dieser Schritt eine
          Huerde und keine Gelegenheit - und jemand, der ihn wegklickt, muesste
          befuerchten, dass seine Antworten nicht gelten. */}
      <p className="mt-4 text-xs text-slate-500">
        Deine Antworten gelten auch ohne diesen Schritt weiter. Ändern kannst du sie
        jederzeit.
      </p>
    </section>
  );
}

/** Kurzfassung - der ganze Text steht im eigenen Bericht. */
function Short({ entry }: { entry: ReadoutEntry | null }) {
  const value = entry?.value;
  if (!value) return <span className="text-slate-400">noch nicht beantwortet</span>;

  switch (value.kind) {
    case "ordinal":
    case "choice":
      return <>{value.label}</>;
    case "choices":
      return <>{value.labels.join(", ")}</>;
    case "number":
      return <>{`${value.number} ${value.unit}`}</>;
    case "money":
      return <>{`${value.amount.toLocaleString("de-DE")} ${value.currency}`}</>;
    case "date":
      return <>{new Date(value.date).toLocaleDateString("de-DE")}</>;
    case "text":
      return <>{value.text}</>;
    case "perPerson":
      return (
        <>
          {value.per
            .map((row) =>
              `${row.person}: ${row.number === null ? "keine feste Erwartung" : `${row.number} ${row.unit}`}`)
            .join(" · ")}
        </>
      );
    case "windows":
      return (
        <>
          {value.windows
            .map((w) => `${w.day} ${w.from}–${w.to} (${w.timezone})`)
            .join(" · ")}
        </>
      );
    case "entries":
      return <>{value.entries.map((e) => e.text).join(" · ")}</>;
    default:
      return <span className="text-slate-500">siehe Bericht</span>;
  }
}
