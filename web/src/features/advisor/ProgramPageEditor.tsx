"use client";

import { ChangeEvent, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_ACCENT, DEFAULT_ACCENT_B, GRADIENT_PRESETS, accentStyles, parseAccent } from "@/features/advisor/programAccent";
import { ProgramRichText } from "@/features/advisor/programRichText";
import { changeTextAlign, type TextAlign } from "@/features/advisor/programTextAlign";
import { changeTextSize } from "@/features/advisor/programTextSize";
import { saveProgramPageAction } from "@/features/advisor/teamProgramActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

export type ProgramPageLabels = {
  published: string;
  publishedHint: string;
  slug: string;
  slugHint: string;
  welcome: string;
  welcomePlaceholder: string;
  logo: string;
  logoChange: string;
  logoRemove: string;
  save: string;
  previewTitle: string;
  previewOpen: string;
  previewCode: string;
  previewGo: string;
  eyebrow: string;
  draftNote: string;
  copy: string;
  copied: string;
  accent: string;
  accentA: string;
  accentB: string;
  accentHint: string;
  bigger: string;
  smaller: string;
  bold: string;
  italic: string;
  list: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  formatHint: string;
};

const SLUG_FILTER = /[^a-z0-9-]+/g;

/** Verkleinert ein Logo auf hoechstens 512 Pixel, damit es sicher unter 2 MB bleibt. */
async function readLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = url;
    });
    const scale = Math.min(1, 512 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Programmseite einrichten, mit Vorschau daneben: Was links getippt wird,
 * steht rechts sofort so da, wie die Seite aussehen wird. Veroeffentlicht ist
 * sie erst mit dem Haken.
 */
export function ProgramPageEditor({
  orgId,
  orgName,
  origin,
  initialSlug,
  initialPublished,
  initialWelcome,
  hasLogo,
  initialAccent,
  initialAccentB,
  labels,
}: {
  orgId: string;
  orgName: string;
  origin: string;
  initialSlug: string | null;
  initialPublished: boolean;
  initialWelcome: string | null;
  hasLogo: boolean;
  initialAccent: string | null;
  initialAccentB: string | null;
  labels: ProgramPageLabels;
}) {
  const suggestion = orgName.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(SLUG_FILTER, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const [slug, setSlug] = useState(initialSlug ?? suggestion);
  const [published, setPublished] = useState(initialPublished);
  const [welcome, setWelcome] = useState(initialWelcome ?? "");
  const [logo, setLogo] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [copied, setCopied] = useState(false);
  const startA = parseAccent(initialAccent) ?? DEFAULT_ACCENT;
  const startB = parseAccent(initialAccentB) ?? (initialAccent ? startA : DEFAULT_ACCENT_B);
  const [colorA, setColorA] = useState(startA);
  const [colorB, setColorB] = useState(startB);
  // Was gerade im Hex-Feld steht - auch, wenn es noch kein gueltiger Code ist.
  const [hexA, setHexA] = useState(startA);
  const [hexB, setHexB] = useState(startB);
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Nach einer Groessenaenderung wird die Auswahl wiederhergestellt, sobald der neue Text im Feld steht.
  const pendingSelection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    const area = textRef.current;
    if (area && pendingSelection.current) {
      area.focus();
      area.setSelectionRange(pendingSelection.current[0], pendingSelection.current[1]);
      pendingSelection.current = null;
    }
  }, [welcome]);
  const look = accentStyles(colorA, colorB);

  function setBoth(a: string, b: string) {
    setColorA(a);
    setColorB(b);
    setHexA(a);
    setHexB(b);
  }
  function typeHex(which: "a" | "b", value: string) {
    (which === "a" ? setHexA : setHexB)(value);
    const parsed = parseAccent(value);
    if (parsed) (which === "a" ? setColorA : setColorB)(parsed);
  }
  const url = `${origin}/p/${slug || "…"}`;
  const shownLogo = removeLogo ? "" : logo || (hasLogo && initialSlug ? `/api/program-logo/${initialSlug}` : "");

  /** Eine Stufe groesser oder kleiner; die Regeln stehen in programTextSize.ts. Die Auswahl bleibt stehen. */
  function changeSize(delta: 1 | -1) {
    const area = textRef.current;
    if (!area) return;
    const result = changeTextSize(welcome, area.selectionStart, area.selectionEnd, delta);
    if (result.text.length > 600) return;
    pendingSelection.current = [result.selectionStart, result.selectionEnd];
    setWelcome(result.text);
  }

  /** Richtet die Zeilen unter der Auswahl aus; die Regeln stehen in programTextAlign.ts. Die Auswahl bleibt stehen. */
  function changeAlign(align: TextAlign) {
    const area = textRef.current;
    if (!area) return;
    const result = changeTextAlign(welcome, area.selectionStart, area.selectionEnd, align);
    if (result.text.length > 600) return;
    pendingSelection.current = [result.selectionStart, result.selectionEnd];
    setWelcome(result.text);
  }

  /** Umschliesst die Auswahl mit Zeichen (fett, kursiv) oder setzt "- " vor jede Zeile (Liste). Die Auswahl bleibt stehen. */
  function format(kind: "bold" | "italic" | "list") {
    const area = textRef.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = welcome.slice(start, end);
    let next: string;
    let selection: [number, number];
    if (kind === "list") {
      const lines = (selected || "").split("\n");
      const listed = lines.map((line) => (line.startsWith("- ") ? line : `- ${line}`)).join("\n");
      next = welcome.slice(0, start) + listed + welcome.slice(end);
      selection = [start, start + listed.length];
    } else {
      const mark = kind === "bold" ? "**" : "*";
      next = welcome.slice(0, start) + mark + selected + mark + welcome.slice(end);
      selection = [start + mark.length, start + mark.length + selected.length];
    }
    if (next.length > 600) return;
    pendingSelection.current = selection;
    setWelcome(next);
  }

  async function onLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogo(await readLogo(file));
    setRemoveLogo(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <form action={saveProgramPageAction} className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="logo_image_data" value={logo} />
        <input type="hidden" name="removeLogo" value={removeLogo ? "yes" : "no"} />

        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 has-[:checked]:border-violet-400 has-[:checked]:bg-violet-50">
          <input type="checkbox" name="published" value="yes" checked={published} onChange={(event) => setPublished(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-600" />
          <span>
            <span className="block text-sm font-semibold text-slate-950">{labels.published}</span>
            <span className="block text-xs leading-5 text-slate-600">{labels.publishedHint}</span>
          </span>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{labels.slug}</span>
          <input
            name="slug"
            value={slug}
            maxLength={40}
            onChange={(event) => setSlug(event.target.value.toLowerCase().replace(SLUG_FILTER, "-"))}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
          />
          <span className="mt-1 block break-all text-xs leading-5 text-slate-500">{labels.slugHint}</span>
        </label>

        <div className="block">
          <label htmlFor="program-welcome" className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{labels.welcome}</label>
          <div className="mt-2 flex flex-wrap items-center gap-1" role="toolbar" aria-label={labels.welcome}>
            {([["bold", labels.bold, "B", "font-extrabold"], ["italic", labels.italic, "I", "italic"], ["bigger", labels.bigger, "A+", "text-base font-semibold"], ["smaller", labels.smaller, "A−", "text-xs"], ["list", labels.list, "•", ""]] as const).map(([kind, label, glyph, extra]) => (
              <button
                key={kind}
                type="button"
                aria-label={label}
                title={label}
                onClick={() => (kind === "bigger" ? changeSize(1) : kind === "smaller" ? changeSize(-1) : format(kind))}
                className={`grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-sm text-slate-800 hover:bg-slate-100 ${extra}`}
              >
                {glyph}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />
            {([["left", labels.alignLeft, "M3 5h14M3 9h9M3 13h14M3 17h9"], ["center", labels.alignCenter, "M3 5h14M6 9h8M3 13h14M6 17h8"], ["right", labels.alignRight, "M3 5h14M8 9h9M3 13h14M8 17h9"]] as const).map(([align, label, path]) => (
              <button
                key={align}
                type="button"
                aria-label={label}
                title={label}
                onClick={() => changeAlign(align)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d={path} />
                </svg>
              </button>
            ))}
          </div>
          <textarea
            id="program-welcome"
            ref={textRef}
            name="welcome"
            rows={5}
            maxLength={600}
            value={welcome}
            placeholder={labels.welcomePlaceholder}
            onChange={(event) => setWelcome(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-100"
          />
          <span className="mt-1 block text-xs leading-5 text-slate-500">{labels.formatHint}</span>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{labels.accent}</legend>
          <input type="hidden" name="accent" value={colorA} />
          <input type="hidden" name="accentB" value={colorB} />
          <div className="flex flex-wrap gap-2">
            {GRADIENT_PRESETS.map((preset) => {
              const on = colorA === preset.a && colorB === preset.b;
              return (
                <button
                  key={preset.name}
                  type="button"
                  aria-label={preset.name}
                  aria-pressed={on}
                  title={preset.name}
                  onClick={() => setBoth(preset.a, preset.b)}
                  style={{ background: preset.a === preset.b ? preset.a : `linear-gradient(135deg, ${preset.a}, ${preset.b})` }}
                  className={`h-10 w-14 rounded-xl ring-offset-2 transition ${on ? "ring-2 ring-slate-900" : "ring-1 ring-slate-200 hover:ring-slate-400"}`}
                />
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["a", labels.accentA, colorA, hexA], ["b", labels.accentB, colorB, hexB]] as const).map(([which, label, color, hex]) => (
              <div key={which}>
                <span className="block text-xs font-medium text-slate-600">{label}</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={label}
                    value={color}
                    onChange={(event) => (which === "a" ? (setColorA(event.target.value.toLowerCase()), setHexA(event.target.value.toLowerCase())) : (setColorB(event.target.value.toLowerCase()), setHexB(event.target.value.toLowerCase())))}
                    className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                  />
                  <input
                    type="text"
                    inputMode="text"
                    aria-label={`${label} (Hex)`}
                    value={hex}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(event) => typeHex(which, event.target.value)}
                    aria-invalid={!parseAccent(hex)}
                    className={`min-h-11 w-full rounded-xl border px-3 font-mono text-sm uppercase ${parseAccent(hex) ? "border-slate-300" : "border-rose-400 bg-rose-50"}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <span className="text-xs leading-5 text-slate-500">{labels.accentHint}</span>
        </fieldset>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{labels.logo}</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {shownLogo ? labels.logoChange : labels.logo}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogo} className="sr-only" />
            </label>
            {shownLogo ? (
              <button type="button" onClick={() => { setLogo(""); setRemoveLogo(true); }} className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline">
                {labels.logoRemove}
              </button>
            ) : null}
          </div>
        </div>

        <SubmitButton label={labels.save} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-6 py-3 text-sm font-semibold" />
      </form>

      <aside aria-label={labels.previewTitle} className="grid content-start gap-3">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{labels.previewTitle}</p>
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_-24px_rgba(60,40,180,0.4)]">
          <div className="relative overflow-hidden px-5 pb-6 pt-6 text-center" style={{ background: look.background, color: look.text }}>
            <div className="relative z-10 flex flex-col items-center">
              {shownLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownLogo} alt="" className="h-14 w-14 rounded-xl bg-white object-contain p-1.5 shadow" />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-current/10 text-xl font-extrabold ring-1 ring-current/25">{orgName.slice(0, 1).toUpperCase()}</span>
              )}
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-75">{labels.eyebrow}</p>
              <p className="mt-1 break-words text-xl font-semibold tracking-tight">{orgName}</p>
            </div>
          </div>
          <div className="px-5 py-5">
            <ProgramRichText text={welcome || labels.welcomePlaceholder} className="text-sm leading-6 text-slate-700" />
            <div className="mt-4 grid gap-2">
              <div className="rounded-xl border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold tracking-[.25em] text-slate-400">{labels.previewCode}</div>
              <div className="rounded-xl px-4 py-2.5 text-center text-sm font-semibold" style={{ background: look.button, color: look.buttonText }}>{labels.previewGo}</div>
            </div>
          </div>
        </div>
        {!published ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{labels.draftNote}</p> : null}
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="min-w-0 flex-1 break-all font-medium">{url}</span>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* Kopieren wird manchmal abgelehnt - die Adresse steht ohnehin da. */
              }
            }}
            className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            {copied ? labels.copied : labels.copy}
          </button>
        </div>
        {initialPublished && initialSlug ? (
          <a href={`/p/${initialSlug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
            {labels.previewOpen} ↗
          </a>
        ) : null}
      </aside>
    </div>
  );
}
