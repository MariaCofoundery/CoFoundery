"use client";

import { useId, useState } from "react";
import styles from "./landing.module.css";

/**
 * Haeufige Fragen als Akkordeon: es ist immer nur eine Antwort offen, die erste beim Laden. Die Antwort
 * gleitet auf (Zeilenhoehe 0fr -> 1fr), das Zeichen dreht sich. Jede Frage ist eine Schaltflaeche mit
 * aria-expanded und die Antwort eine benannte Region; Tastatur (Tab, Enter, Leertaste) geht von selbst.
 */
export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className={styles.faqList}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ""}`}>
            <h3>
              <button
                type="button"
                id={`${base}-q${i}`}
                className={styles.faqQ}
                aria-expanded={isOpen}
                aria-controls={`${base}-a${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span>{item.q}</span><i className={styles.faqIcon} aria-hidden="true" />
              </button>
            </h3>
            <div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} className={styles.faqA}>
              <div><p>{item.a}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
