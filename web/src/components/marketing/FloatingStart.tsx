"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./landing.module.css";

/**
 * Der Knopf, der mitlaeuft: erscheint nach dem ersten halben Bildschirm, damit der naechste Schritt
 * immer in Reichweite ist, und verschwindet, sobald der Schluss mit dem eigenen Knopf im Bild ist.
 */
export function FloatingStart({ label, endId }: { label: string; endId: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const end = document.getElementById(endId);
    let io: IntersectionObserver | undefined;
    if (end && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => setAtEnd(entries[0].isIntersecting), { threshold: 0.1 });
      io.observe(end);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, [endId]);

  const on = scrolled && !atEnd;
  return (
    <Link
      href="/start"
      className={`${styles.btn} ${styles.btnPrimary} ${styles.fab} ${on ? styles.fabOn : ""}`}
      aria-hidden={!on}
      tabIndex={on ? 0 : -1}
    >
      {label}
    </Link>
  );
}
