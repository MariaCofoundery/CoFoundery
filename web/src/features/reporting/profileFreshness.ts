import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { FOUNDER_PROFILE_INSTRUMENT_ID } from "@/features/instruments/instruments";

/**
 * Wie alt das Bild ist — über alle Quellen hinweg, die es zeigt.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS NICHT AUS EINEM FRAGEBOGEN KOMMEN DARF
 * ---------------------------------------------------------------------------
 *
 * `InstrumentNote` datiert bis heute nur den v1-Bericht. Auf einer Seite, die
 * aus sechs Quellen zusammenläuft, ist das ein falscher Stand: Wer gestern
 * seine Fähigkeiten überarbeitet und den Fragebogen vor einem halben Jahr
 * abgegeben hat, läse „Stand: vor sechs Monaten" über einem Bild, das gestern
 * entstanden ist.
 *
 * ---------------------------------------------------------------------------
 * EIGENE ABFRAGE STATT ERWEITERTER LADER
 * ---------------------------------------------------------------------------
 *
 * Die fünf vorhandenen Lader holen keine Zeitstempel, und sie werden auch von
 * der Advisor-Ansicht, von FIND und von Connect benutzt. Sie um Spalten zu
 * erweitern, die nur diese eine Seite braucht, hieße fünf geteilte Stellen
 * anzufassen, um an einer etwas anzuzeigen.
 *
 * Deshalb eine eigene, schmale Abfrage: je Quelle der jüngste Zeitstempel,
 * mehr nicht. Sie liest dieselben Zeilen, die die Seite ohnehin zeigt, und
 * legt nichts an.
 *
 * ---------------------------------------------------------------------------
 * LIEBER KEIN STAND ALS EIN FALSCHER
 * ---------------------------------------------------------------------------
 *
 * Schlägt eine Abfrage fehl, zählt sie nicht mit — und wenn gar nichts
 * zurückkommt, gibt es `null`, und die Seite schreibt keinen Stand hin. Ein
 * Datum, das nur die Hälfte der Quellen kennt, ist schlechter als keines:
 * Man sieht ihm nicht an, dass es die Hälfte ist.
 */

type Quelle = {
  table: string;
  column: string;
  /** Spalte, über die die Person gefunden wird. */
  userColumn: string;
  /** Zusätzliche Gleichheitsbedingung, etwa die Fassung des Bogens. */
  equals?: [string, string];
};

const QUELLEN: Quelle[] = [
  { table: "person_core", column: "updated_at", userColumn: "user_id" },
  { table: "person_capability_entries", column: "updated_at", userColumn: "user_id" },
  { table: "person_strengths", column: "updated_at", userColumn: "user_id" },
  { table: "direction_statements", column: "updated_at", userColumn: "user_id" },
  // `person_resources` hat kein `updated_at`. `created_at` ist der Zeitpunkt,
  // an dem der Eintrag entstand - fuer "wie alt ist dieses Bild" genau genug.
  { table: "person_resources", column: "created_at", userColumn: "user_id" },
  // Das Arbeitsprofil: wann es abgegeben wurde. Ein angefangener, nie
  // abgegebener Bogen steht nicht auf der Seite und datiert sie deshalb auch
  // nicht.
  {
    table: "assessments",
    column: "submitted_at",
    userColumn: "user_id",
    equals: ["instrument_id", FOUNDER_PROFILE_INSTRUMENT_ID],
  },
];

/**
 * Der jüngste Zeitpunkt über alle Quellen - oder `null`.
 *
 * Sie wirft nicht. Ein Fehler beim Datieren darf die Seite nicht kosten.
 */
export async function getProfileFreshness(
  client: SupabaseClient,
  userId: string
): Promise<string | null> {
  const zeitpunkte = await Promise.all(
    QUELLEN.map(async (quelle) => {
      try {
        let abfrage = client
          .from(quelle.table)
          .select(quelle.column)
          .eq(quelle.userColumn, userId)
          .not(quelle.column, "is", null)
          .order(quelle.column, { ascending: false })
          .limit(1);

        if (quelle.equals) {
          abfrage = abfrage.eq(quelle.equals[0], quelle.equals[1]);
        }

        const { data, error } = await abfrage;
        if (error || !data?.length) return null;

        const wert = (data[0] as unknown as Record<string, unknown>)[quelle.column];
        return typeof wert === "string" ? wert : null;
      } catch {
        return null;
      }
    })
  );

  const gueltig = zeitpunkte
    .filter((wert): wert is string => Boolean(wert))
    .filter((wert) => !Number.isNaN(Date.parse(wert)));

  if (gueltig.length === 0) return null;

  return gueltig.reduce((juengster, wert) =>
    Date.parse(wert) > Date.parse(juengster) ? wert : juengster
  );
}

/** Die Quellen, die den Stand bestimmen - für den Test. */
export const PROFILE_FRESHNESS_SOURCES = QUELLEN;
