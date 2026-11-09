"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { UserText } from "@/features/ui/UserText";
import { useFocusTrap } from "@/features/ui/useFocusTrap";
import { announcementTeaser, type AnnouncementDisplay } from "@/features/announcements/announcementModel";

/**
 * Die drei Darstellungen einer Mitteilung (Entwurf vom 08.11.2026, freigegeben).
 *
 *   card    Karte in der Mitte. Die Seite pausiert, bis man klickt. Auf dem Handy ein Blatt von unten.
 *   banner  Band oben. Die Seite bleibt bedienbar. Titel und erster Satz, "Weiterlesen" klappt auf.
 *   toast   Hinweis unten rechts, auf dem Handy ueber den Reitern. Die Seite bleibt bedienbar.
 *
 * Nur das Aussehen. Wann sie kommt und was "weggeklickt" heisst, ist fuer alle drei gleich
 * (siehe AnnouncementPopup). Dieselbe Komponente zeigt auch die Vorschau im Admin-Bereich,
 * damit niemand dort etwas anderes sieht als die Leute in der Plattform:
 *
 *   frame="page"     liegt fest ueber der Seite (das echte Pop-up).
 *   frame="preview"  liegt in einem Rahmen (`relative` + `overflow-hidden`), ohne Klicks nach aussen.
 *
 * `compact` ist die Handy-Fassung. Im echten Pop-up kommt sie aus der Fensterbreite, in der
 * Vorschau aus dem Umschalter Computer/Handy - deshalb keine Breakpoint-Klassen hier.
 *
 * Der Text wird als Text gesetzt (UserText), nie als Markup.
 */

export type AnnouncementViewProps = {
  display: AnnouncementDisplay;
  compact: boolean;
  frame: "page" | "preview";
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  dismissLabel: string;
  closeLabel: string;
  readMoreLabel: string;
  lessLabel: string;
  laterNote: string;
  onCta?: () => void;
  onDismiss?: () => void;
  closeRef?: Ref<HTMLButtonElement>;
  titleId?: string;
};

const VIOLET = "bg-[#6D49E0] text-white hover:bg-[#5B3BC8]";
const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D49E0] focus-visible:ring-offset-2";

function Megaphone({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6D49E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
    </svg>
  );
}

function Paragraphs({ body, className }: { body: string; className: string }) {
  return (
    <>
      {body.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className={`${className} whitespace-pre-line`}>
          <UserText text={paragraph} />
        </p>
      ))}
    </>
  );
}

export function AnnouncementView(props: AnnouncementViewProps) {
  if (props.display === "banner") return <Banner {...props} />;
  if (props.display === "toast") return <Toast {...props} />;
  return <Card {...props} />;
}

/* ---------------------------------------------------------------------- A · Karte */

function Card({ compact, frame, eyebrow, title, body, ctaLabel, dismissLabel, closeLabel, laterNote, onCta, onDismiss, closeRef, titleId }: AnnouncementViewProps) {
  const live = frame === "page";
  const dialogRef = useRef<HTMLDivElement>(null);
  // Die Karte haelt die Seite an: Tab kreist in ihr (nur das echte Pop-up, nicht die Vorschau im Admin-Bereich).
  useFocusTrap(live, dialogRef);
  return (
    // Das aeussere Feld scrollt: Auf einem kleinen Bildschirm darf kein Teil der Karte abgeschnitten sein.
    <div
      className={`${live ? "fixed inset-0 z-[60] overflow-y-auto" : "absolute inset-0 overflow-hidden"} bg-slate-950/55`}
      onClick={live ? onDismiss : undefined}
    >
      <div className={`flex min-h-full w-full ${compact ? "items-end" : "mx-auto max-w-[27.5rem] items-center px-4 py-8"}`}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
          className={`relative w-full overflow-hidden bg-white shadow-[0_30px_80px_-20px_rgba(20,21,43,.55)] ${compact ? "rounded-t-3xl" : "rounded-[22px]"}`}
        >
          <div className={`${compact ? "h-[5px]" : "h-1.5"} bg-[#6D49E0]`} aria-hidden="true" />
          {compact ? null : (
            <button
              type="button"
              aria-label={closeLabel}
              onClick={onDismiss}
              className={`absolute right-4 top-[18px] grid h-11 w-11 place-items-center rounded-xl text-[22px] leading-none text-[#4A4D68] hover:bg-slate-100 ${RING}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
          <div className={`grid gap-3.5 ${compact ? "px-5 pb-6 pt-3.5" : "px-[30px] pb-6 pt-7"}`}>
            {compact ? <div className="mx-auto h-1 w-10 rounded-full bg-[#C9CCE0]" aria-hidden="true" /> : null}
            <div className="flex items-center gap-2">
              {compact ? null : (
                <span aria-hidden="true" className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#F0EBFD]">
                  <Megaphone />
                </span>
              )}
              <span className="text-[11px] font-bold uppercase tracking-[.1em] text-[#5A5D78]">{eyebrow}</span>
            </div>
            <h2 id={titleId} className={`font-brand font-bold leading-tight text-[#14152B] ${compact ? "text-[23px]" : "pr-8 text-[26px]"}`}>
              {title}
            </h2>
            <div className="grid gap-3">
              <Paragraphs body={body} className="text-[15px] leading-6 text-[#3C3F5A]" />
            </div>
            <div className="mt-1.5 grid gap-1.5">
              {ctaLabel ? (
                <button type="button" onClick={onCta} className={`inline-flex min-h-12 w-full items-center justify-center rounded-[14px] px-6 text-[15px] font-semibold ${VIOLET} ${RING}`}>
                  {ctaLabel}
                </button>
              ) : null}
              <button
                ref={closeRef}
                type="button"
                onClick={onDismiss}
                className={`inline-flex min-h-11 w-full items-center justify-center rounded-[14px] px-6 text-[15px] font-semibold ${RING} ${
                  ctaLabel ? "text-[#3C3F5A] hover:text-[#14152B]" : `min-h-12 ${VIOLET}`
                }`}
              >
                {dismissLabel}
              </button>
            </div>
            {compact ? null : <p className="text-center text-xs leading-5 text-[#5A5D78]">{laterNote}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- B · Band */

function Banner({ compact, frame, eyebrow, title, body, ctaLabel, dismissLabel, readMoreLabel, lessLabel, onCta, onDismiss, closeRef }: AnnouncementViewProps) {
  const [open, setOpen] = useState(false);
  const { teaser, hasMore } = announcementTeaser(body);
  const ref = useRef<HTMLElement>(null);
  // Das Band liegt oben auf dem Dokument und scrollt mit weg. Die Seite darunter rueckt um seine Hoehe
  // nach unten - so verdeckt es keine Kopfzeile und keine Seitenleiste, und klebende Leisten setzen
  // erst an, wenn es aus dem Bild ist.
  useEffect(() => {
    if (frame !== "page" || !ref.current) return;
    const node = ref.current;
    const previous = document.body.style.paddingTop;
    const apply = () => {
      document.body.style.paddingTop = `${node.offsetHeight}px`;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.body.style.paddingTop = previous;
    };
  }, [frame]);
  const position = frame === "page" ? "absolute inset-x-0 top-0 z-[60]" : "absolute inset-x-0 top-0 z-10";
  const toggle = hasMore ? (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
      className={`inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-semibold text-[#4B2FB8] underline-offset-2 hover:underline ${RING}`}
    >
      {open ? lessLabel : readMoreLabel}
    </button>
  ) : null;
  const cta = ctaLabel ? (
    <button type="button" onClick={onCta} className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold ${VIOLET} ${RING}`}>
      {ctaLabel}
    </button>
  ) : null;
  const close = (
    <button
      ref={closeRef}
      type="button"
      aria-label={dismissLabel}
      onClick={onDismiss}
      className={`grid h-11 w-11 flex-none place-items-center rounded-xl text-[22px] leading-none text-[#3C3F5A] hover:bg-white/70 ${RING}`}
    >
      <span aria-hidden="true">×</span>
    </button>
  );

  return (
    <section ref={ref} aria-label={eyebrow} className={`${position} border-b-2 border-[#6D49E0] bg-[#EEE9FD] shadow-[0_8px_24px_-12px_rgba(20,21,43,.4)]`}>
      {compact ? (
        <div className="grid gap-2.5 py-3.5 pl-[18px] pr-2.5">
          <div className="flex items-start gap-2">
            <p className="mt-1.5 flex-1 text-[15px] font-bold leading-[21px] text-[#14152B]">{title}</p>
            {close}
          </div>
          {open ? <Paragraphs body={body} className="pr-2 text-sm leading-[21px] text-[#2A2C47]" /> : <p className="pr-2 text-sm leading-[21px] text-[#2A2C47]">{teaser}</p>}
          <div className="flex flex-wrap items-center gap-3">
            {cta}
            {toggle}
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-6xl items-start gap-3.5 py-2.5 pl-6 pr-4">
          <span aria-hidden="true" className="mt-1.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-white">
            <Megaphone />
          </span>
          <div className="min-w-0 flex-1 py-1.5 text-sm leading-[21px] text-[#2A2C47]">
            {open ? (
              <div className="grid gap-2">
                <p className="font-bold text-[#14152B]">{title}</p>
                <Paragraphs body={body} className="" />
                <div>{toggle}</div>
              </div>
            ) : (
              <p>
                <b className="text-[#14152B]">{title}.</b> {teaser} {toggle}
              </p>
            )}
          </div>
          <div className="mt-0.5 flex-none">{cta}</div>
          {close}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------- C · Hinweis */

function Toast({ compact, frame, eyebrow, title, body, ctaLabel, dismissLabel, closeLabel, onCta, onDismiss, closeRef }: AnnouncementViewProps) {
  const position =
    frame === "page"
      ? compact
        ? "fixed inset-x-2.5 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60]"
        : "fixed bottom-6 right-6 z-[60] w-[22.5rem]"
      : compact
      ? "absolute inset-x-2.5 bottom-[74px] z-10"
      : "absolute bottom-6 right-6 z-10 w-[22.5rem]";
  return (
    <section
      aria-label={eyebrow}
      className={`${position} grid gap-2 rounded-[18px] border border-[#DCDEEC] bg-white pb-4 pl-5 pr-2.5 pt-2 shadow-[0_20px_50px_-12px_rgba(20,21,43,.35)]`}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-[#F0EBFD]">
          <Megaphone size={15} />
        </span>
        <span className="flex-1 text-[11px] font-bold uppercase tracking-[.1em] text-[#5A5D78]">{eyebrow}</span>
        <button
          ref={closeRef}
          type="button"
          aria-label={closeLabel}
          onClick={onDismiss}
          className={`grid h-11 w-11 place-items-center rounded-xl text-xl leading-none text-[#3C3F5A] hover:bg-slate-100 ${RING}`}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className="grid max-h-[40vh] gap-2 overflow-y-auto pr-2.5">
        <h2 className="text-[17px] font-bold leading-[23px] text-[#14152B]">{title}</h2>
        <Paragraphs body={body} className="text-sm leading-[21px] text-[#3C3F5A]" />
      </div>
      <div className="mt-1 flex gap-2">
        {ctaLabel ? (
          <button type="button" onClick={onCta} className={`inline-flex min-h-11 items-center rounded-xl px-[18px] text-sm font-semibold ${VIOLET} ${RING}`}>
            {ctaLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className={`inline-flex min-h-11 items-center rounded-xl px-3.5 text-sm font-semibold ${RING} ${
            ctaLabel ? "border border-[#DCDEEC] bg-white text-[#14152B] hover:bg-slate-50" : `px-[18px] ${VIOLET}`
          }`}
        >
          {dismissLabel}
        </button>
      </div>
    </section>
  );
}
