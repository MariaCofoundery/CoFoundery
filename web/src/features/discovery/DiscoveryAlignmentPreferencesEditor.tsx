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

export function DiscoveryAlignmentPreferencesEditor({
  initialPreferences,
  ownTendencies,
}: {
  initialPreferences: DiscoveryAlignmentPreferences;
  ownTendencies: DiscoveryOwnAlignmentTendency[];
}) {
  const t = useTranslations("discovery");
  const [preferences, setPreferences] = useState<DiscoveryAlignmentPreferences>(initialPreferences);
  const prioritizedCount = Object.keys(preferences).length;

  function setImportance(
    dimension: DiscoveryAlignmentDimension,
    importance: DiscoveryAlignmentImportance
  ) {
    setPreferences((current) => {
      if (importance === "not_prioritized") {
        const next = { ...current };
        delete next[dimension];
        return next;
      }
      if (!current[dimension] && Object.keys(current).length >= 3) return current;
      return {
        ...current,
        [dimension]: {
          importance,
          relationPreference:
            current[dimension]?.relationPreference ?? "no_direction_preference",
        },
      };
    });
  }

  function setRelation(
    dimension: DiscoveryAlignmentDimension,
    relationPreference: DiscoveryAlignmentRelationPreference
  ) {
    setPreferences((current) => {
      const existing = current[dimension];
      return existing
        ? { ...current, [dimension]: { ...existing, relationPreference } }
        : current;
    });
  }

  return (
    <div className="mt-4 grid gap-3">
      <p className="text-xs leading-5 text-slate-500">
        {t("v2.alignment.priorityCount", { count: prioritizedCount })}
      </p>
      {DISCOVERY_ALIGNMENT_DIMENSIONS.map((dimension) => {
        const preference = preferences[dimension];
        const ownTendency = ownTendencies.find((entry) => entry.dimension === dimension);
        const importance = preference?.importance ?? "not_prioritized";
        return (
          <section key={dimension} className="rounded-2xl border border-violet-100 bg-white p-4">
            <h3 className="font-semibold text-slate-950">
              {t(`v2.alignment.dimensions.${dimension}`)}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t(`v2.alignment.info.${dimension}.summary`)}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-800">
                {t("v2.alignment.importance.label")}
                <select
                  name={`alignmentImportance.${dimension}`}
                  value={importance}
                  onChange={(event) =>
                    setImportance(dimension, event.target.value as DiscoveryAlignmentImportance)
                  }
                  className={SELECT_CLASS}
                >
                  {DISCOVERY_ALIGNMENT_IMPORTANCE.map((value) => (
                    <option
                      key={value}
                      value={value}
                      disabled={
                        value !== "not_prioritized" && !preference && prioritizedCount >= 3
                      }
                    >
                      {t(`v2.alignment.importance.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              {preference ? (
                <label className="text-sm font-medium text-slate-800">
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
              ) : null}
            </div>
            {preference && ownTendency ? (
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
          </section>
        );
      })}
    </div>
  );
}
