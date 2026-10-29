"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnnouncementCard } from "@/features/announcements/AnnouncementCard";
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

  useEffect(() => {
    if (!item) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void dismiss();
    };
    window.addEventListener("keydown", onKey);
    // Der Hintergrund scrollt nicht mit.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

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
    // Das aeussere Feld scrollt: Auf einem kleinen Bildschirm darf kein Teil der Karte abgeschnitten sein.
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/55 px-4 py-8" onClick={() => void dismiss()}>
      <div className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-title"
          className="w-full"
          onClick={(event) => event.stopPropagation()}
        >
          <AnnouncementCard
            eyebrow={t("eyebrow")}
            title={item.title}
            body={item.body}
            titleId="announcement-title"
            actions={
              <>
                {item.ctaHref && item.ctaLabel ? (
                  <button
                    type="button"
                    onClick={() => void dismiss(item.ctaHref ?? undefined)}
                    className="brand-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  >
                    {item.ctaLabel}
                  </button>
                ) : null}
                <button
                  ref={closeButton}
                  type="button"
                  onClick={() => void dismiss()}
                  className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    item.ctaHref && item.ctaLabel ? "text-slate-600 hover:text-slate-950" : "brand-cta"
                  }`}
                >
                  {t("dismiss")}
                </button>
              </>
            }
            footer={t("later")}
          />
        </div>
      </div>
    </div>
  );
}
