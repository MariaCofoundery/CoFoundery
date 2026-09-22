"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { SpokenText } from "./interviewAudio";

/**
 * Einen Text vorlesen lassen.
 *
 * EINE DATEI, EIN KNOPF, KEIN WEBAUDIO. Die Datei liegt statisch, also genügt
 * ein `Audio`-Objekt - keine Bibliothek, keine Sitzung, kein Aufruf irgendwo.
 *
 * ER LÄDT ERST BEIM DRÜCKEN. `preload="none"` wäre am Element nötig; hier
 * entsteht das Objekt überhaupt erst beim ersten Klick. Auf einem Telefon mit
 * mobilen Daten sind fünfzig Kilobyte je Frage wenig - aber nur, wenn sie
 * nicht für alle acht Fragen im Voraus geladen werden.
 *
 * UND ER HÖRT AUF, WENN DIE SEITE WECHSELT. Eine Stimme, die weiterredet,
 * während man schon bei der nächsten Frage ist, ist schlimmer als keine.
 */
export function SpeakButton({ audio, label }: { audio: SpokenText; label?: string }) {
  const t = useTranslations("capability");
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      player.current?.pause();
      player.current = null;
    },
    []
  );

  const toggle = () => {
    if (playing) {
      player.current?.pause();
      setPlaying(false);
      return;
    }
    if (!player.current) {
      player.current = new Audio(audio.src);
      player.current.addEventListener("ended", () => setPlaying(false));
      // Ein Ladefehler darf nicht als "spielt gerade" stehen bleiben: Dann
      // drueckt man ein zweites Mal und nichts passiert.
      player.current.addEventListener("error", () => setPlaying(false));
    }
    void player.current.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label ?? (playing ? t("interview.audio.stop") : t("interview.audio.play"))}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <span aria-hidden>{playing ? "■" : "▶"}</span>
      {playing ? t("interview.audio.stop") : t("interview.audio.play")}
      <span className="text-slate-400">{Math.round(audio.seconds)}s</span>
    </button>
  );
}
