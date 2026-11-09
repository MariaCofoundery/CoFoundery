"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnnouncementPreview } from "@/features/announcements/AnnouncementPreview";
import { AnnouncementView } from "@/features/announcements/AnnouncementView";
import { ANNOUNCEMENT_DISPLAYS, ANNOUNCEMENT_LIMITS, type AnnouncementDisplay } from "@/features/announcements/announcementModel";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Das Formular fuer eine Mitteilung, links, und die Vorschau, rechts.
 *
 * Die Vorschau liest Titel, Text, Knopf und Darstellung live aus dem Formular.
 * "Mir selbst zeigen" legt die Mitteilung nur auf diese Seite, fuer niemanden
 * sonst: nichts wird gespeichert, nichts als gesehen vermerkt.
 */

export type AnnouncementDraft = {
  id: string | null;
  titleDe: string;
  bodyDe: string;
  ctaLabelDe: string;
  ctaHref: string;
  titleEn: string;
  bodyEn: string;
  ctaLabelEn: string;
  showOnce: boolean;
  startsOn: string;
  endsOn: string;
  display: AnnouncementDisplay;
};

const input = "mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal";
const button = "min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50";
const primary = "min-h-11 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50";

/** Ein Mini-Bild je Darstellung auf der Kachel. */
function Thumb({ display }: { display: AnnouncementDisplay }) {
  return (
    <span aria-hidden="true" className="relative block h-14 overflow-hidden rounded-lg bg-[#E6E8F2]">
      {display === "card" ? (
        <>
          <span className="absolute inset-0 bg-[#14152B]/45" />
          <span className="absolute inset-x-[30%] inset-y-3 rounded-[5px] border-t-[3px] border-[#6D49E0] bg-white" />
        </>
      ) : null}
      {display === "banner" ? (
        <>
          <span className="absolute inset-x-0 top-0 h-2 bg-white" />
          <span className="absolute inset-x-0 top-2 h-3 border-b-2 border-[#6D49E0] bg-[#E3DBFC]" />
        </>
      ) : null}
      {display === "toast" ? <span className="absolute bottom-1.5 right-1.5 h-5 w-[40%] rounded-[5px] bg-white shadow-md" /> : null}
    </span>
  );
}

export function AnnouncementForm({
  draft,
  action,
  cancelHref,
}: {
  draft: AnnouncementDraft;
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string | null;
}) {
  const t = useTranslations("admin.announcements");
  const tn = useTranslations("notices.announcements");
  const [title, setTitle] = useState(draft.titleDe);
  const [body, setBody] = useState(draft.bodyDe);
  const [ctaLabel, setCtaLabel] = useState(draft.ctaLabelDe);
  const [ctaHref, setCtaHref] = useState(draft.ctaHref);
  const [display, setDisplay] = useState<AnnouncementDisplay>(draft.display);
  const [showing, setShowing] = useState(false);
  const [compact, setCompact] = useState(false);
  const hasCta = Boolean(ctaLabel.trim() && ctaHref.trim());
  const hasEnglish = Boolean(draft.titleEn || draft.bodyEn || draft.ctaLabelEn);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!showing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setShowing(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [showing]);

  return (
    <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <form action={action} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
        <h2 className="text-lg font-semibold text-slate-950">{draft.id ? t("editTitle") : t("newTitle")}</h2>

        <label className="block text-sm font-semibold">
          {t("titleDe")}
          <input
            name="title_de"
            required
            maxLength={ANNOUNCEMENT_LIMITS.title}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={input}
          />
        </label>
        <label className="block text-sm font-semibold">
          {t("bodyDe")}
          <textarea
            name="body_de"
            required
            rows={6}
            maxLength={ANNOUNCEMENT_LIMITS.body}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className={`${input} py-2 leading-6`}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">{t("bodyHint")}</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            {t("ctaLabelDe")}
            <input name="cta_label_de" maxLength={ANNOUNCEMENT_LIMITS.cta} value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            {t("ctaHref")}
            <input
              name="cta_href"
              maxLength={ANNOUNCEMENT_LIMITS.href}
              value={ctaHref}
              onChange={(event) => setCtaHref(event.target.value)}
              placeholder="/connect"
              className={input}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">{t("ctaHint")}</span>
          </label>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">{t("display.label")}</legend>
          <div className="grid grid-cols-3 gap-2.5">
            {ANNOUNCEMENT_DISPLAYS.map((key) => (
              <label
                key={key}
                className={`grid cursor-pointer content-start gap-1.5 rounded-2xl border-2 p-2.5 focus-within:ring-2 focus-within:ring-[#6D49E0] ${
                  display === key ? "border-[#6D49E0] bg-[#F3EFFE]" : "border-[#E1E3EF] bg-white hover:border-[#C9CCE0]"
                }`}
              >
                <input type="radio" name="display" value={key} checked={display === key} onChange={() => setDisplay(key)} className="sr-only" />
                <Thumb display={key} />
                <span className="text-[13px] font-bold text-[#14152B]">{t(`display.${key}.name`)}</span>
                <span className="text-[11.5px] leading-4 text-[#4A4D68]">{t(`display.${key}.hint`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <details open={hasEnglish} className="rounded-xl bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-violet-800">{t("englishOptional")}</summary>
          <div className="mt-3 grid gap-4">
            <p className="text-xs text-slate-500">{t("enHint")}</p>
            <label className="block text-sm font-semibold">
              {t("titleEn")}
              <input name="title_en" maxLength={ANNOUNCEMENT_LIMITS.title} defaultValue={draft.titleEn} className={input} />
            </label>
            <label className="block text-sm font-semibold">
              {t("bodyEn")}
              <textarea name="body_en" rows={5} maxLength={ANNOUNCEMENT_LIMITS.body} defaultValue={draft.bodyEn} className={`${input} py-2`} />
            </label>
            <label className="block text-sm font-semibold">
              {t("ctaLabelEn")}
              <input name="cta_label_en" maxLength={ANNOUNCEMENT_LIMITS.cta} defaultValue={draft.ctaLabelEn} className={input} />
            </label>
          </div>
        </details>

        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="show_once" value="yes" defaultChecked={draft.showOnce} className="mt-1 h-4 w-4" />
          <span>
            <b>{t("showOnce")}</b>
            <span className="mt-0.5 block text-xs text-slate-500">{t("showOnceHint")}</span>
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            {t("startsOn")}
            <input type="date" name="starts_on" defaultValue={draft.startsOn} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            {t("endsOn")}
            <input type="date" name="ends_on" defaultValue={draft.endsOn} className={input} />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          {cancelHref ? (
            <Link href={cancelHref} className={`${button} inline-flex items-center`}>
              {t("cancel")}
            </Link>
          ) : null}
          <button type="button" onClick={() => setShowing(true)} disabled={!title.trim() || !body.trim()} className={button}>
            {t("showMe")}
          </button>
          <SubmitButton label={t("save")} pendingLabel={t("saving")} className={primary} />
        </div>
      </form>

      <section aria-label={t("previewTitle")} className="grid gap-3 lg:sticky lg:top-6">
        <AnnouncementPreview display={display} title={title.trim()} body={body.trim()} ctaLabel={hasCta ? ctaLabel.trim() : null} />
        <p className="text-xs leading-5 text-slate-500">{t("showMeHint")}</p>
      </section>

      {showing ? (
        <AnnouncementView
          display={display}
          compact={compact}
          frame="page"
          eyebrow={tn("eyebrow")}
          title={title.trim()}
          body={body.trim()}
          ctaLabel={hasCta ? ctaLabel.trim() : null}
          dismissLabel={tn("dismiss")}
          closeLabel={tn("close")}
          readMoreLabel={tn("readMore")}
          lessLabel={tn("less")}
          laterNote={tn("later")}
          onCta={() => setShowing(false)}
          onDismiss={() => setShowing(false)}
          titleId="announcement-self-preview"
        />
      ) : null}
    </div>
  );
}
