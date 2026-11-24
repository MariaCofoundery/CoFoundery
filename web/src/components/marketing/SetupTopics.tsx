"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

type Topic = { t: string; q: string };

/**
 * Founder Setup auf der Startseite. Auf dem Rechner: links die Frage zum gewaehlten Thema, rechts die
 * Themen. Auf dem Handy gibt es kein Feld oben, sondern die Frage klappt direkt unter dem angetippten
 * Thema auf (sonst liegt sie bei einem Thema weiter unten ausser Sicht).
 *
 * Beim Darueberfahren, Antippen oder Anfokussieren wechselt die Frage. Auf dem Rechner wechseln die
 * Themen sanft von selbst (alle gut drei Sekunden), solange noch niemand etwas angefasst hat und die
 * Flaeche im Bild ist; auf dem Handy und bei "weniger Bewegung" im Geraet nicht, denn dort wuerde sich
 * die Seite unter dem Finger verschieben.
 */
export function SetupTopics({ topics, note, more }: { topics: Topic[]; note: string; more: string }) {
  const [index, setIndex] = useState(2);
  const bodyRef = useRef<HTMLDivElement>(null);
  const manual = useRef(false);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(max-width: 899px)").matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => { if (timer) clearInterval(timer); timer = undefined; };
    const go = () => {
      if (timer || manual.current) return;
      timer = setInterval(() => {
        if (manual.current) { stop(); return; }
        setIndex((i) => (i + 1) % topics.length);
      }, 3400);
    };
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) go(); else stop(); }, { threshold: 0.4 });
    io.observe(body);
    return () => { stop(); io.disconnect(); };
  }, [topics.length]);

  function choose(i: number) {
    manual.current = true;
    setIndex(i);
  }

  const current = topics[index];
  return (
    <div ref={bodyRef} className={styles.setupBody}>
      <div className={styles.focus} aria-live="polite">
        <span key={`t${index}`} className={`${styles.focusTopic} ${styles.swap}`}>{current.t}</span>
        <p key={`q${index}`} className={`${styles.focusQ} ${styles.swap}`}>{current.q}</p>
        <p className={styles.focusNote}>{note}</p>
      </div>
      <div>
        <ul className={styles.topics}>
          {topics.map((topic, i) => (
            <li key={topic.t} className={index === i ? styles.topicOpen : undefined}>
              <button
                type="button"
                className={styles.topicBtn}
                aria-current={index === i ? "true" : "false"}
                onClick={() => choose(i)}
                onFocus={() => choose(i)}
                onPointerEnter={(event) => { if (event.pointerType === "mouse") choose(i); }}
              >
                <span>{topic.t}</span><i className={styles.topicDot} />
              </button>
              <div className={styles.inlineQ} aria-hidden={index !== i}>
                <div><p>{topic.q}</p></div>
              </div>
            </li>
          ))}
          <li className={styles.topicMore} aria-label={more}>…</li>
        </ul>
        <p className={styles.mobileNote}>{note}</p>
      </div>
    </div>
  );
}
