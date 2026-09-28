"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveDiscoveryTopics, type TopicChoice } from "@/features/instruments/v2/discoveryTopicActions";
import type { DiscoveryTopic, TopicWish } from "@/features/instruments/v2/discoveryTopics";

/**
 * Was dir bei der Suche wichtig ist.
 *
 * ---------------------------------------------------------------------------
 * DIE REIHENFOLGE IST DAS EIGENTLICHE BEDIENELEMENT
 * ---------------------------------------------------------------------------
 *
 * Es gibt keine Schieberegler und keine Sternchen, weil es keine Gewichte
 * gibt. Du sagst je Thema, was du dir wünschst - und bringst die Themen, die
 * dir wichtig sind, in deine Reihenfolge.
 *
 * Wer bei Thema 1 nicht passt, rutscht nicht durch Treffer weiter unten nach
 * oben. Das ist der Grund für die Reihenfolge: Sie macht aus „mir ist das
 * wichtiger" eine Entscheidung statt einer Zahl.
 *
 * UND DIE REGEL STEHT AN JEDEM THEMA. „Gleiche Antwort oder höchstens eine
 * Stufe Unterschied" ist eine Verabredung, keine Erkenntnis - wer danach
 * filtert, soll wissen, was der Filter getan hat.
 */

type Props = { topics: DiscoveryTopic[]; initial: TopicChoice[] };

export function DiscoveryTopicsForm({ topics, initial }: Props) {
  const t = useTranslations("alignment");
  const [chosen, setChosen] = useState<TopicChoice[]>(
    [...initial].sort((a, b) => a.rank - b.rank)
  );
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const byKey = new Map(chosen.map((choice) => [choice.topicKey, choice]));

  const persist = async (next: TopicChoice[]) => {
    setChosen(next);
    setState("saving");
    const result = await saveDiscoveryTopics(next);
    setState(result.ok ? "saved" : "error");
  };

  const setWish = (topicKey: string, wish: TopicWish | null) => {
    if (wish === null) {
      persist(chosen.filter((choice) => choice.topicKey !== topicKey)
        .map((choice, index) => ({ ...choice, rank: index + 1 })));
      return;
    }
    const existing = byKey.get(topicKey);
    persist(
      existing
        ? chosen.map((choice) => (choice.topicKey === topicKey ? { ...choice, wish } : choice))
        : [...chosen, { topicKey, wish, rank: chosen.length + 1 }]
    );
  };

  const move = (topicKey: string, direction: -1 | 1) => {
    const index = chosen.findIndex((choice) => choice.topicKey === topicKey);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= chosen.length) return;
    const next = [...chosen];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next.map((choice, at) => ({ ...choice, rank: at + 1 })));
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">{t("discovery.orderTitle")}</h2>
        <p className="text-sm text-slate-600">{t("discovery.orderIntro")}</p>

        {chosen.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            {t("discovery.nothingChosen")}
          </p>
        )}

        <ol className="space-y-2">
          {chosen.map((choice, index) => {
            const topic = topics.find((entry) => entry.key === choice.topicKey);
            return (
              <li key={choice.topicKey} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="w-6 text-sm text-slate-400">{index + 1}.</span>
                <span className="flex-1 text-sm text-slate-900">
                  {topic?.label}
                  <span className="ml-2 text-xs text-slate-500">
                    {t(`discovery.wish.${choice.wish}`)}
                  </span>
                </span>
                <button type="button" aria-label={t("discovery.up")} disabled={index === 0}
                  onClick={() => move(choice.topicKey, -1)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-30">↑</button>
                <button type="button" aria-label={t("discovery.down")} disabled={index === chosen.length - 1}
                  onClick={() => move(choice.topicKey, 1)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-30">↓</button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">{t("discovery.topicsTitle")}</h2>
        <ul className="space-y-3">
          {topics.map((topic) => {
            const choice = byKey.get(topic.key);
            return (
              <li key={topic.key} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-900">{topic.label}</p>
                {/* Die Regel steht am Thema, nicht in einer Fußnote. */}
                <p className="mt-1 text-xs text-slate-500">
                  {t("discovery.ruleLabel")}: {topic.rule}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {([null, "similar", "different"] as const).map((wish) => (
                    <button
                      key={String(wish)}
                      type="button"
                      aria-pressed={(choice?.wish ?? null) === wish}
                      onClick={() => setWish(topic.key, wish)}
                      className={[
                        "rounded-full border px-3 py-1.5 text-sm",
                        (choice?.wish ?? null) === wish
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
                      ].join(" ")}
                    >
                      {t(`discovery.wish.${wish ?? "none"}`)}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-slate-500">
        {state === "saving" && t("shell.saving")}
        {state === "saved" && t("shell.saved")}
        {state === "error" && t("discovery.saveError")}
      </p>
    </div>
  );
}
