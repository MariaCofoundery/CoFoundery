"use client";

import { ChangeEvent, useState } from "react";
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
  labels,
}: {
  orgId: string;
  orgName: string;
  origin: string;
  initialSlug: string | null;
  initialPublished: boolean;
  initialWelcome: string | null;
  hasLogo: boolean;
  labels: ProgramPageLabels;
}) {
  const suggestion = orgName.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(SLUG_FILTER, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const [slug, setSlug] = useState(initialSlug ?? suggestion);
  const [published, setPublished] = useState(initialPublished);
  const [welcome, setWelcome] = useState(initialWelcome ?? "");
  const [logo, setLogo] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${origin}/p/${slug || "…"}`;
  const shownLogo = removeLogo ? "" : logo || (hasLogo && initialSlug ? `/api/program-logo/${initialSlug}/logo` : "");

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

        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{labels.welcome}</span>
          <textarea
            name="welcome"
            rows={4}
            maxLength={600}
            value={welcome}
            placeholder={labels.welcomePlaceholder}
            onChange={(event) => setWelcome(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-100"
          />
        </label>

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
          <div className="advisor-hero px-5 pb-6 pt-6 text-center">
            <div className="relative z-10 flex flex-col items-center">
              {shownLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownLogo} alt="" className="h-14 w-14 rounded-xl bg-white object-contain p-1.5 shadow" />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/15 text-xl font-extrabold ring-1 ring-white/25">{orgName.slice(0, 1).toUpperCase()}</span>
              )}
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200">{labels.eyebrow}</p>
              <p className="mt-1 break-words text-xl font-semibold tracking-tight">{orgName}</p>
            </div>
          </div>
          <div className="px-5 py-5">
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{welcome || labels.welcomePlaceholder}</p>
            <div className="mt-4 grid gap-2">
              <div className="rounded-xl border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold tracking-[.25em] text-slate-400">{labels.previewCode}</div>
              <div className="brand-cta rounded-xl px-4 py-2.5 text-center text-sm font-semibold">{labels.previewGo}</div>
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
