"use client";

import { useEffect, useState } from "react";

// Die Schreibbewegung gibt es nur auf grossen Bildschirmen und nur ohne
// Bewegungswunsch. Auf dem Handy springt sonst die ganze Seite, sobald die Zeile
// einen Umbruch mehr oder weniger hat, und die Notizen darunter wandern mit.
const CALM_QUERY = "(prefers-reduced-motion: reduce), (max-width: 767px)";

/**
 * Schreibt die Titel der Probleme, die gerade am Brett haengen, nacheinander
 * hin und loescht sie wieder.
 *
 * Es sind echte Eintraege, keine erfundenen Beispiele, und sie stehen in der
 * Reihenfolge des Bretts (neueste zuerst) - die Zeile hebt keines hervor.
 * Ohne Bewegungswunsch oder mit nur einem Eintrag steht der erste Titel still
 * da. Das Rendern auf dem Server liefert ebenfalls den vollen ersten Titel,
 * damit die Seite auch ohne Skript vollstaendig ist.
 */
export function ProblemTypewriter({ lines, label }: { lines: string[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(lines[0]?.length ?? 0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (lines.length < 2) return;
    if (window.matchMedia(CALM_QUERY).matches) return;
    setAnimated(true);

    let line = 0;
    let chars = lines[0].length;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      if (!deleting) {
        chars += 1;
        setShown(chars);
        if (chars >= lines[line].length) {
          deleting = true;
          timer = setTimeout(step, 2400);
          return;
        }
        timer = setTimeout(step, 40);
        return;
      }
      chars -= 1;
      setShown(chars);
      if (chars <= 0) {
        deleting = false;
        line = (line + 1) % lines.length;
        setIndex(line);
        timer = setTimeout(step, 350);
        return;
      }
      timer = setTimeout(step, 16);
    };

    // Der erste Titel steht erst eine Weile still, bevor es losgeht.
    deleting = true;
    timer = setTimeout(step, 3200);
    return () => {
      clearTimeout(timer);
      setAnimated(false);
    };
  }, [lines]);

  const text = (lines[index] ?? "").slice(0, shown);

  return (
    <p className={`problem-typewriter${animated ? "" : " problem-typewriter--static"}`} aria-label={`${label}: ${lines[0] ?? ""}`}>
      <span className="problem-typewriter__label">{label}</span>
      <span aria-hidden="true" className="problem-typewriter__text">
        {text}
        <span className="problem-typewriter__caret" />
      </span>
    </p>
  );
}
