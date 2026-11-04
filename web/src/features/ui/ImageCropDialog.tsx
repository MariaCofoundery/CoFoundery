"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";

import { clampCropOffset, cropBounds, cropDrawRect } from "@/features/ui/imageCrop";

/**
 * Bildausschnitt waehlen, bevor ein Foto oder Logo gespeichert wird (Feedback an Maria, 04.11.2026).
 *
 * Ein quadratisches Fenster: ziehen (oder Pfeiltasten) verschiebt, der Regler vergroessert. Beim
 * Foto zeigt ein Kreis, was in runden Ansichten zu sehen ist; das Bild fuellt immer die ganze
 * Flaeche. Beim Logo darf man kleiner zoomen - der Rand bleibt dann durchsichtig (PNG).
 *
 * Alles passiert im Browser, wie vorher die Verkleinerung: Hinaus geht nur das fertige Bild in der
 * gewuenschten Groesse. Kein Paket, keine Gesichtserkennung.
 */
export type CropOutput = { size: number; type: "image/jpeg" | "image/png"; quality?: number };

const VIEW = 288;

export function ImageCropDialog({
  file,
  src,
  shape,
  output,
  onCancel,
  onConfirm,
}: {
  /** Ein frisch gewaehltes Bild. */
  file?: File | null;
  /** Oder ein schon gespeichertes (Adresse muss Lesen ueber Herkunftsgrenzen erlauben). */
  src?: string | null;
  shape: "photo" | "logo";
  output: CropOutput;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const t = useTranslations("common.imageCrop");
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const imageSrc = objectUrl ?? src ?? null;
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; start: { x: number; y: number } } | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    if (!imageSrc) return;
    const next = new window.Image();
    if (!objectUrl) next.crossOrigin = "anonymous";
    next.onload = () => {
      setImage(next);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    next.onerror = () => setFailed(true);
    next.src = imageSrc;
  }, [imageSrc, objectUrl]);

  useEffect(() => {
    confirmRef.current?.focus();
  }, [image]);

  const bounds = image ? cropBounds(image.naturalWidth, image.naturalHeight, VIEW, shape === "logo") : null;
  const rect = image && bounds ? cropDrawRect(image.naturalWidth, image.naturalHeight, VIEW, zoom, offset) : null;

  const move = (dx: number, dy: number) => {
    if (!image) return;
    setOffset((current) => clampCropOffset(image.naturalWidth, image.naturalHeight, VIEW, zoom, { x: current.x + dx, y: current.y + dy }));
  };
  const setZoomClamped = (value: number) => {
    if (!image || !bounds) return;
    const next = Math.min(bounds.maxZoom, Math.max(bounds.minZoom, value));
    setZoom(next);
    setOffset((current) => clampCropOffset(image.naturalWidth, image.naturalHeight, VIEW, next, current));
  };

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, start: offset };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !image) return;
    const { x, y, start } = drag.current;
    setOffset(clampCropOffset(image.naturalWidth, image.naturalHeight, VIEW, zoom, { x: start.x + event.clientX - x, y: start.y + event.clientY - y }));
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[event.key]) {
      event.preventDefault();
      move(...moves[event.key]);
    } else if (event.key === "+" || event.key === "=") {
      setZoomClamped(zoom + 0.1);
    } else if (event.key === "-") {
      setZoomClamped(zoom - 0.1);
    } else if (event.key === "Escape") {
      onCancel();
    }
  }

  function confirm() {
    if (!image || !rect) return;
    const canvas = document.createElement("canvas");
    canvas.width = output.size;
    canvas.height = output.size;
    const context = canvas.getContext("2d");
    if (!context) return setFailed(true);
    if (output.type === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, output.size, output.size);
    }
    const k = output.size / VIEW;
    context.drawImage(image, rect.left * k, rect.top * k, rect.width * k, rect.height * k);
    try {
      onConfirm(canvas.toDataURL(output.type, output.quality ?? 0.85));
    } catch {
      // Ein Bild von einer fremden Adresse ohne Freigabe laesst sich nicht auslesen.
      setFailed(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-slate-950/50" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.3)] sm:p-6">
        <h2 id="image-crop-title" className="text-lg font-semibold text-slate-950">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t(shape === "logo" ? "hintLogo" : "hint")}</p>

        {failed ? (
          <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t("failed")}</p>
        ) : (
          <div
            role="application"
            tabIndex={0}
            aria-label={t("area")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={onKeyDown}
            className={`relative mx-auto mt-4 cursor-grab touch-none select-none overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 active:cursor-grabbing ${
              shape === "logo" ? "bg-[repeating-conic-gradient(#f1f0f7_0_25%,#ffffff_0_50%)] bg-[length:16px_16px]" : "bg-slate-100"
            }`}
            style={{ width: VIEW, height: VIEW }}
          >
            {image && rect ? (
              // eslint-disable-next-line @next/next/no-img-element -- ein Bild aus dem Browser, kein Seitenbild
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
              />
            ) : null}
            {/* Der Kreis zeigt, was in runden Ansichten bleibt; aussen herum leicht abgedunkelt. */}
            {shape === "photo" ? (
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />
            ) : null}
          </div>
        )}

        {bounds && !failed ? (
          <label className="mt-4 block text-sm font-medium text-slate-800">
            {t("zoom")}
            <input
              type="range"
              min={bounds.minZoom}
              max={bounds.maxZoom}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoomClamped(Number(event.target.value))}
              className="mt-2 block w-full accent-violet-600"
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {t("cancel")}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={confirm}
            disabled={!image || failed}
            className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("confirm")}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
