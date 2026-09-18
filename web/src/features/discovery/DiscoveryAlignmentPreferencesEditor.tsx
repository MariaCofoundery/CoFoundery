"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  DISCOVERY_ALIGNMENT_DIMENSIONS,
  DISCOVERY_ALIGNMENT_IMPORTANCE,
  DISCOVERY_ALIGNMENT_RELATION_PREFERENCES,
  type DiscoveryAlignmentDimension,
  type DiscoveryAlignmentImportance,
  type DiscoveryOwnAlignmentTendency,
  type DiscoveryAlignmentPreferences,
  type DiscoveryAlignmentRelationPreference,
} from "@/features/discovery/discoveryTypes";

const SELECT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100";

const IMPORTANCE_CHOICES = DISCOVERY_ALIGNMENT_IMPORTANCE.filter(
  (value) => value !== "not_prioritized"
);

/**
 * Die Alignment-Praeferenzen - samt dem Haekchen, das sie ueberhaupt erst
 * hervorruft.
 *
 * Das Haekchen stand bis zum 18.09.2026 in der Seite, die sechs Dimensionen
 * darunter immer. Wer Alignment nicht nutzen wollte - die Voreinstellung -
 * scrollte trotzdem an sechs Kaesten mit je zwei Auswahlfeldern vorbei. Sie
 * sind jetzt zusammen an einer Stelle, und sie erscheinen erst, wenn jemand
 * sie auch will.
 *
 * Beides gehoert in dieselbe Komponente, weil das eine das andere steuert;
 * getrennt haette die Seite einen Zustand fuehren muessen, der nur hier
 * gebraucht wird.
 *
 * ZWEI GRUPPEN STATT EINER LISTE, seit 18.09.2026:
 *
 *   Vorher standen alle sechs Dimensionen gleich aussehend untereinander, und
 *   die gewaehlten blieben an ihrem Platz - nur ein Auswahlfeld darin stand
 *   anders. Wer drei ausgewaehlt hatte, musste die Liste absuchen, um die
 *   eigene Auswahl wiederzufinden. Dazu wuchs jede gewaehlte Karte um ein
 *   zweites Auswahlfeld und einen Kasten, waehrend die uebrigen klein
 *   blieben: sechs unterschiedlich hohe Kaesten ohne erkennbare Ordnung.
 *
 *   Jetzt oben "Deine Auswahl" mit allem, was dazugehoert, darunter kompakt
 *   die uebrigen. Die Reihenfolge INNERHALB beider Gruppen bleibt die feste
 *   Reihenfolge der Dimensionen - so springt beim Auswaehlen genau ein
 *   Eintrag, und zwar sichtbar von unten nach oben.
 */
export function DiscoveryAlignmentPreferencesEditor({
  initialEnabled,
  initialPreferences,
  ownTendencies,
}: {
  initialEnabled: boolean;
  initialPreferences: DiscoveryAlignmentPreferences;
  ownTendencies: DiscoveryOwnAlignmentTendency[];
}) {
  const t = useTranslations("discovery");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [preferences, setPreferences] = useState<DiscoveryAlignmentPreferences>(initialPreferences);

  const chosen = DISCOVERY_ALIGNMENT_DIMENSIONS.filter((dimension) => preferences[dimension]);
  const remaining = DISCOVERY_ALIGNMENT_DIMENSIONS.filter((dimension) => !preferences[dimension]);
  const isFull = chosen.length >= 3;

  function addDimension(dimension: DiscoveryAlignmentDimension) {
    setPreferences((current) => {
      if (current[dimension] || Object.keys(current).length >= 3) return current;
      // "Auswaehlen" heisst erstmal nur "das ist mir wichtig". Die Abstufung
      // darauf ist eine zweite, feinere Frage - sie soll nicht schon im
      // Moment des Auswaehlens beantwortet werden muessen.
      return {
        ...current,
        [dimension]: { importance: "important", relationPreference: "no_direction_preference" },
      };
    });
  }

  function removeDimension(dimension: DiscoveryAlignmentDimension) {
    setPreferences((current) => {
      const next = { ...current };
      delete next[dimension];
      return next;
    });
  }

  function setImportance(
    dimension: DiscoveryAlignmentDimension,
    importance: Exclude<DiscoveryAlignmentImportance, "not_prioritized">
  ) {
    setPreferences((current) =>
      current[dimension] ? { ...current, [dimension]: { ...current[dimension], importance } } : current
    );
  }

  function setRelation(
    dimension: DiscoveryAlignmentDimension,
    relationPreference: DiscoveryAlignmentRelationPreference
  ) {
    setPreferences((current) =>
      current[dimension]
        ? { ...current, [dimension]: { ...current[dimension], relationPreference } }
        : current
    );
  }

  function renderInfo(dimension: DiscoveryAlignmentDimension) {
    return (
      <details className="mt-3 rounded-xl bg-violet-50/60 px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-violet-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100">
          {t("v2.alignment.info.open")}
        </summary>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {t(`v2.alignment.info.${dimension}.body`)}
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
          {t(`v2.alignment.info.${dimension}.conversation`)}
        </p>
      </details>
    );
  }

  return (
    <div className="mt-4 grid gap-3">
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-violet-100 bg-white p-3">
        <input
          type="checkbox"
          name="discoveryV2AlignmentEnabled"
          value="true"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />
        <span>
          <span className="block text-sm font-semibold text-slate-900">
            {t("v2.alignment.enable")}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {t("v2.alignment.chooseHelp")}
          </span>
        </span>
      </label>

      {/* Erst wenn jemand es auch will. Ohne Haekchen sind die sechs Kaesten
          sechs Kaesten, durch die man sich scrollt. */}
      {!enabled ? null : (
        <>
          {/* ----------------------------------------------------------------
              Deine Auswahl
              ---------------------------------------------------------------- */}
          <section className="rounded-2xl border border-violet-200/80 bg-[linear-gradient(120deg,rgba(124,58,237,.05),rgba(34,211,238,.06))] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-violet-900">
                {t("v2.alignment.yourChoice")}
              </h3>
              <span className="text-xs font-medium text-violet-900/70">
                {t("v2.alignment.yourChoiceCount", { count: chosen.length })}
              </span>
            </div>

            {chosen.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {t("v2.alignment.emptyChoice")}
              </p>
            ) : (
              <div className="mt-3 grid gap-3">
                {chosen.map((dimension) => {
                  const preference = preferences[dimension]!;
                  const ownTendency = ownTendencies.find((entry) => entry.dimension === dimension);
                  return (
                    <article key={dimension} className="rounded-2xl border border-violet-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-950">
                            {t(`v2.alignment.dimensions.${dimension}`)}
                          </h4>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {t(`v2.alignment.info.${dimension}.summary`)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDimension(dimension)}
                          className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800"
                        >
                          {t("v2.alignment.remove")}
                        </button>
                      </div>

                      {/* Zwei Knoepfe statt eines Auswahlfelds mit drei
                          Eintraegen: "Nicht priorisiert" war dort der
                          Ausstieg aus einer Liste, in der man gerade erst
                          drin ist - das Entfernen steht jetzt oben. */}
                      <fieldset className="mt-3">
                        <legend className="text-xs font-medium text-slate-500">
                          {t("v2.alignment.importance.formLabel")}
                        </legend>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {IMPORTANCE_CHOICES.map((value) => (
                            <label
                              key={value}
                              className="cursor-pointer has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-violet-100 inline-flex min-h-11 items-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition"
                            >
                              <input
                                type="radio"
                                name={`alignmentImportance.${dimension}`}
                                value={value}
                                checked={preference.importance === value}
                                onChange={() => setImportance(dimension, value)}
                                className="sr-only"
                              />
                              {/* Kurzform: Die langen Beschriftungen ("Fuer
                                  dich wichtig") bleiben fuer die Profilseite,
                                  wo sie als eigener Satz stehen. Hier steht
                                  die Frage schon in der Legende darueber. */}
                              {t(`v2.alignment.importance.short.${value}`)}
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <label className="mt-3 block text-sm font-medium text-slate-800">
                        {t("v2.alignment.relation.label")}
                        <select
                          name={`alignmentRelationPreference.${dimension}`}
                          value={preference.relationPreference}
                          onChange={(event) =>
                            setRelation(
                              dimension,
                              event.target.value as DiscoveryAlignmentRelationPreference
                            )
                          }
                          className={SELECT_CLASS}
                        >
                          {DISCOVERY_ALIGNMENT_RELATION_PREFERENCES.map((value) => (
                            <option key={value} value={value}>
                              {t(`v2.alignment.relation.${value}`)}
                            </option>
                          ))}
                        </select>
                      </label>

                      {ownTendency ? (
                        <aside className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {t("v2.alignment.ownContext.title")}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {t("v2.alignment.ownContext.description", { tendency: ownTendency.label })}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {t("v2.alignment.ownContext.note")}
                          </p>
                        </aside>
                      ) : null}

                      {renderInfo(dimension)}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* ----------------------------------------------------------------
              Die uebrigen
              ---------------------------------------------------------------- */}
          {remaining.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t("v2.alignment.more")}
              </h3>
              {isFull ? (
                <p className="mt-2 text-xs leading-5 text-slate-500">{t("v2.alignment.full")}</p>
              ) : null}
              <div className="mt-3 grid gap-2">
                {remaining.map((dimension) => (
                  <article
                    key={dimension}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-950">
                          {t(`v2.alignment.dimensions.${dimension}`)}
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {t(`v2.alignment.info.${dimension}.summary`)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addDimension(dimension)}
                        disabled={isFull}
                        className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        {t("v2.alignment.add")}
                      </button>
                    </div>
                    {renderInfo(dimension)}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
