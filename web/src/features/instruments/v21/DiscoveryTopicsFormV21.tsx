"use client";

import { useState, useTransition } from "react";
import {
  saveDiscoveryTopicsV21,
  type TopicChoiceV21,
} from "@/features/instruments/v21/discoveryActionsV21";
import type { DiscoveryTopicV21, TopicWish } from "@/features/instruments/v21/discoveryTopicsV21";

/**
 * Was dir bei anderen wichtig ist.
 *
 * ---------------------------------------------------------------------------
 * KEINE OBERGRENZE, ABER EINE REIHENFOLGE
 * ---------------------------------------------------------------------------
 *
 * Früher waren es höchstens drei Themen. Maria am 28.09.2026: „nicht nur drei
 * Themen auswählen kann, wo mir die Ähnlichkeit oder Unterschiede wichtig
 * sind, sondern bei allen“. Die Grenze ist weg.
 *
 * Was damit NICHT kommt, ist eine Punktzahl. Bei vierzehn Themen wäre die
 * naheliegende Sortierung „wie viele deiner Wünsche treffen zu“ - eine Zahl
 * über alle Themen, also der Passungswert mit selbst gesetzten Gewichten.
 * Stattdessen ordnest du sie, und sortiert wird der Reihe nach: Dein erstes
 * Thema ist wirklich das erste, und kein Stapel kleiner Treffer wiegt es auf.
 *
 * ---------------------------------------------------------------------------
 * ÄHNLICH ODER ANDERS - BEIDES IST EIN WUNSCH
 * ---------------------------------------------------------------------------
 *
 * Bei manchem will man jemanden, der es genauso sieht. Bei anderem will man
 * ausdrücklich jemanden, der es anders macht. Nur „ähnlich“ anzubieten würde
 * unterstellen, dass Gleichheit immer das Ziel ist - und genau das ist beim
 * Gründen oft falsch.
 */

type Props = {
  topics: DiscoveryTopicV21[];
  initial: TopicChoiceV21[];
};

export function DiscoveryTopicsFormV21({ topics, initial }: Props) {
  const [chosen, setChosen] = useState<TopicChoiceV21[]>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const choiceOf = (topicKey: string) => chosen.find((entry) => entry.topicKey === topicKey);

  const toggle = (topicKey: string) => {
    setMessage(null);
    setChosen((current) =>
      current.some((entry) => entry.topicKey === topicKey)
        ? current.filter((entry) => entry.topicKey !== topicKey)
        : [...current, { topicKey, wish: "similar" as TopicWish, rank: current.length + 1 }],
    );
  };

  const setWish = (topicKey: string, wish: TopicWish) => {
    setMessage(null);
    setChosen((current) =>
      current.map((entry) => (entry.topicKey === topicKey ? { ...entry, wish } : entry)),
    );
  };

  const move = (topicKey: string, direction: -1 | 1) => {
    setMessage(null);
    setChosen((current) => {
      const sorted = [...current].sort((a, b) => a.rank - b.rank);
      const at = sorted.findIndex((entry) => entry.topicKey === topicKey);
      const to = at + direction;
      if (at < 0 || to < 0 || to >= sorted.length) return current;
      [sorted[at], sorted[to]] = [sorted[to], sorted[at]];
      return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
    });
  };

  const ordered = [...chosen].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {topics.map((topic) => {
          const choice = choiceOf(topic.key);
          return (
            <div
              key={topic.key}
              className={`rounded-xl border p-4 ${
                choice ? "border-slate-900 bg-white" : "border-slate-200 bg-white"
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(choice)}
                  disabled={pending}
                  onChange={() => toggle(topic.key)}
                />
                <span className="flex-1">
                  <span className="text-sm font-medium text-slate-900">{topic.label}</span>
                  {/* WAS „AEHNLICH“ HIER HEISST, STEHT DABEI. Sonst raet jeder
                      etwas anderes - und die Schwelle bei Zahlen ist gesetzt
                      und nicht gemessen, das muss man sehen koennen. */}
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {topic.itemIds.length}{" "}
                    {topic.itemIds.length === 1 ? "Frage" : "Fragen"} · ähnlich heißt hier:{" "}
                    {topic.rule}
                  </span>
                </span>
              </label>

              {choice && (
                <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                  {(["similar", "different"] as const).map((wish) => (
                    <button
                      key={wish}
                      type="button"
                      disabled={pending}
                      onClick={() => setWish(topic.key, wish)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        choice.wish === wish
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {wish === "similar" ? "möglichst ähnlich" : "möglichst anders"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {ordered.length > 1 && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-medium text-slate-900">Deine Reihenfolge</h3>
          <p className="mt-1 text-xs text-slate-600">
            Das oberste Thema entscheidet zuerst. Es gibt keine Punktzahl — wer bei
            deinem ersten Thema passt, steht vor jemandem, der bei drei anderen passt.
          </p>
          <ol className="mt-3 space-y-1">
            {ordered.map((choice, index) => (
              <li key={choice.topicKey} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-slate-400">{index + 1}.</span>
                <span className="flex-1 text-slate-800">
                  {topics.find((topic) => topic.key === choice.topicKey)?.label}
                  <span className="text-slate-500">
                    {" "}
                    — {choice.wish === "similar" ? "ähnlich" : "anders"}
                  </span>
                </span>
                <button
                  type="button"
                  className="px-1 text-slate-500 disabled:opacity-30"
                  disabled={pending || index === 0}
                  onClick={() => move(choice.topicKey, -1)}
                  aria-label="nach oben"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="px-1 text-slate-500 disabled:opacity-30"
                  disabled={pending || index === ordered.length - 1}
                  onClick={() => move(choice.topicKey, 1)}
                  aria-label="nach unten"
                >
                  ↓
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await saveDiscoveryTopicsV21(ordered);
              setMessage(result.ok ? "Gespeichert." : "Das hat nicht geklappt.");
            })
          }
        >
          {pending ? "wird gespeichert…" : "Speichern"}
        </button>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>

      {chosen.length === 0 && (
        <p className="text-sm text-slate-600">
          Ohne Themen zeigt Discovery dir alle — ohne Aussage darüber, wer zu dir passt.
        </p>
      )}
    </div>
  );
}
