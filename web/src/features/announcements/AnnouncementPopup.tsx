"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnnouncementView } from "@/features/announcements/AnnouncementView";
import {
  dismissAnnouncementAction,
  getPendingAnnouncementAction,
  type PendingAnnouncement,
} from "@/features/announcements/announcementActions";

/** Ein anderer Dialog (Einwilligung, Begruessungsbrief) hat Vorrang: Zwei Fenster uebereinander sind eines zu viel. */
function anotherDialogIsOpen() {
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]'));
}

/**
 * Das Pop-up fuer Mitteilungen der Plattform.
 *
 * ABGEHOLT WIRD ERST, WENN ES GEZEIGT WERDEN KANN. Der Abruf vermerkt die
 * Mitteilung als gesehen (bei "einmalig" das Ende ihrer Laufbahn). Wuerde er
 * kommen, waehrend gerade eine Einwilligung offen ist, ginge die Mitteilung
 * verloren, ohne dass sie jemand gesehen hat. Deshalb wird zuerst auf ein freies
 * Fenster gewartet.
 *
 * Weggeklickt - ueber den Knopf, das Kreuz, die Escape-Taste oder daneben -
 * heisst: gelesen. Sie liegt danach in den Nachrichten.
 */
export function AnnouncementPopup() {
  const t = useTranslations("notices.announcements");
  const router = useRouter();
  const [item, setItem] = useState<PendingAnnouncement | null>(null);
  const started = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    let attempts = 0;

    const tryFetch = async () => {
      if (cancelled) return;
      if (anotherDialogIsOpen()) {
        attempts += 1;
        if (attempts < 6) timer = window.setTimeout(tryFetch, 4000);
        return;
      }
      const next = await getPendingAnnouncementAction().catch(() => null);
      if (!cancelled && next) setItem(next);
    };
    let timer = window.setTimeout(tryFetch, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Die Handy-Fassung folgt der Fensterbreite (wie sm in Tailwind).
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const modal = item?.display === "card";
  useEffect(() => {
    // Nur die Karte haelt die Seite an. Band und Hinweis lassen sie bedienbar - kein Fokusraub,
    // keine gesperrte Seite, kein Escape, das nebenbei etwas schliesst.
    if (!item || !modal) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      void dismiss();
    };
    window.addEventListener("keydown", onKey, true);
    // Der Hintergrund scrollt nicht mit.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, modal]);

  async function dismiss(then?: string) {
    const current = item;
    setItem(null);
    if (current) await dismissAnnouncementAction(current.id).catch(() => null);
    if (then) {
      if (then.startsWith("/")) router.push(then);
      else window.open(then, "_blank", "noopener,noreferrer");
    }
  }

  if (!item) return null;

  return (
    <AnnouncementView
      display={item.display}
      compact={compact}
      frame="page"
      eyebrow={t("eyebrow")}
      title={item.title}
      body={item.body}
      ctaLabel={item.ctaHref && item.ctaLabel ? item.ctaLabel : null}
      dismissLabel={t("dismiss")}
      closeLabel={t("close")}
      readMoreLabel={t("readMore")}
      lessLabel={t("less")}
      laterNote={t("later")}
      onCta={() => void dismiss(item.ctaHref ?? undefined)}
      onDismiss={() => void dismiss()}
      closeRef={closeButton}
      titleId="announcement-title"
    />
  );
}
