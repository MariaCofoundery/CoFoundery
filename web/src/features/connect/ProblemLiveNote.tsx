"use client";

import { useEffect, useState } from "react";

type Copy = {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  tried: string;
  now: string;
  intents: Record<string, string>;
};

/**
 * Die eigene Notiz, wie sie am Brett haengen wird - sie entsteht beim Tippen.
 *
 * Bewusst ohne Zustand im Formular: Die Komponente hoert auf die Eingaben des
 * Formulars mit der Kennung `formId` und spiegelt sie nur. Das Formular bleibt
 * eine Server-Komponente und weiss nichts davon. Die Texte kommen als Zeichen-
 * ketten herein, nicht als Funktion - eine Funktion laesst sich nicht ueber die
 * Server-Client-Grenze reichen.
 */
export function ProblemLiveNote({ formId, copy }: { formId: string; copy: Copy }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tried, setTried] = useState("");
  const [intent, setIntent] = useState("observation");

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;
    const read = () => {
      const value = (name: string) =>
        (form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";
      setTitle(value("title").trim());
      setDescription(value("description").trim());
      setTried(value("tried").trim());
      const chosen = form.querySelector('input[name="author_intent"]:checked') as HTMLInputElement | null;
      setIntent(chosen?.value ?? "observation");
    };
    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, [formId]);

  return (
    <aside className="problem-live" aria-label={copy.title}>
      <p className="problem-live__label">{copy.title}</p>
      <article className="problem-note problem-note--live" data-intent={intent}>
        <p className="problem-note__tag">{copy.intents[intent] ?? ""}</p>
        <h3 className={`problem-note__title${title ? "" : " problem-note__empty"}`}>
          {title || copy.emptyTitle}
        </h3>
        <p className={`problem-note__body${description ? "" : " problem-note__empty"}`}>
          {description || copy.emptyDescription}
        </p>
        {tried ? (
          <p className="problem-note__tried">
            <b>{copy.tried}</b>
            {tried}
          </p>
        ) : null}
        <p className="problem-note__meta">{copy.now}</p>
      </article>
    </aside>
  );
}
