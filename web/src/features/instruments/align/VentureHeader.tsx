"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVentureName } from "@/features/instruments/align/ventureActions";
import type { Venture } from "@/features/instruments/align/ventureResolution";

/**
 * Der Kopf über dem Venture-Bogen: Name und, wenn nötig, der Hinweis aufs
 * Bestätigen.
 *
 * ---------------------------------------------------------------------------
 * DER NAME WIRD EINMAL GEFRAGT, NICHT VERWALTET
 * ---------------------------------------------------------------------------
 *
 * `founder_teams.name` war seit jeher leer - keine Stelle im Code hat ihn je
 * geschrieben. Ohne ihn stünde im Bericht „ALIGN für —“.
 *
 * Kein eigener Bereich: ein Feld an der Stelle, an der man ohnehin ist. Und
 * ohne Namen geht es weiter - er ist eine Beschriftung und keine Bedingung.
 */
export function VentureHeader({
  venture,
  needsConfirmation,
  introAsks = false,
}: {
  venture: Venture;
  needsConfirmation: boolean;
  /**
   * Fragt die Startseite des Fragebogens gerade selbst nach dem Namen?
   *
   * DANN NICHT NOCH EINMAL HIER. Beim Durchklicken am 30.09.2026 stand auf
   * demselben Bildschirm oben klein „Ohne Namen — benennen" und darunter groß
   * „Wie heißt dein Vorhaben?". Zweimal dieselbe Frage, und die kleine zuerst.
   */
  introAsks?: boolean;
}) {
  const [name, setName] = useState(venture.name ?? "");
  /**
   * Zu ist der Normalfall.
   *
   * GEFRAGT WIRD AUF DER STARTSEITE. Solange die Frage nach dem Namen hier
   * stand, ging sie im Kopf der Seite unter - und sie stand offen, sobald
   * kein Name da war, also auch mitten im Ausfüllen. Sie ist jetzt der erste
   * Schritt des Fragebogens; hier bleibt der Weg zum Umbenennen.
   */
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-3">
      {needsConfirmation && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Es ist jemand dazugekommen. Schau kurz, ob deine Angaben noch stimmen —{" "}
          <a href="/founder-alignment/vorhaben/bestaetigen" className="underline">
            das hattest du angegeben
          </a>
          .
        </p>
      )}

      {open ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-sm text-slate-700">
            Wie heißt das Vorhaben?
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. CoFoundery oder Projekt X"
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() =>
                start(async () => {
                  const result = await setVentureName(venture.id, name);
                  if (result.ok) {
                    setOpen(false);
                    router.refresh();
                  }
                })
              }
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Speichern
            </button>
            {/* OHNE NAMEN GEHT ES WEITER. Er ist eine Beschriftung, keine
                Bedingung - wer jetzt keinen hat, soll trotzdem ausfuellen
                koennen. */}
            <button
              type="button"
              className="text-sm text-slate-600 underline"
              onClick={() => setOpen(false)}
            >
              Später
            </button>
          </div>
        </div>
      ) : (
        !introAsks && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{venture.name ?? "Ohne Namen"}</span>
            {venture.alone && <span className="text-slate-500"> — bisher nur du</span>}
            <button
              type="button"
              className="ml-3 text-slate-500 underline"
              onClick={() => setOpen(true)}
            >
              {venture.name ? "umbenennen" : "benennen"}
            </button>
          </p>
        )
      )}
    </div>
  );
}
