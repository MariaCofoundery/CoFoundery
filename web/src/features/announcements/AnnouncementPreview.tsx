"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnnouncementView } from "@/features/announcements/AnnouncementView";
import type { AnnouncementDisplay } from "@/features/announcements/announcementModel";

/**
 * Die Vorschau im Admin-Bereich: dieselbe Darstellung wie in der Plattform
 * (AnnouncementView), in einem kleinen Abbild der Seite - auf dem Computer
 * oder auf dem Handy. Das Abbild wird in echter Groesse gebaut und verkleinert,
 * damit nichts anders umbricht als beim echten Pop-up.
 */

const DESKTOP = { width: 900, height: 560, scale: 0.55 };
const PHONE = { width: 360, height: 700, scale: 0.62 };

const bar = "rounded bg-[#D5D8E8]";

function MockDesktop() {
  return (
    <div className="absolute inset-0 bg-[#F4F5FB]" aria-hidden="true">
      <div className="flex h-14 items-center gap-7 border-b border-[#E1E3EF] bg-white px-6">
        <span className="text-[13px] font-bold tracking-[.1em]">MADE2FOUND</span>
        <span className="text-sm font-semibold text-[#4B2FB8]">Start</span>
        <span className="text-sm text-[#4A4D68]">Align</span>
        <span className="text-sm text-[#4A4D68]">Find</span>
        <span className="text-sm text-[#4A4D68]">Connect</span>
      </div>
      <div className="grid gap-4 p-8">
        <div className={`h-6 w-1/3 ${bar}`} />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-32 rounded-2xl border border-[#E1E3EF] bg-white" />
          ))}
        </div>
        <div className="h-52 rounded-2xl border border-[#E1E3EF] bg-white" />
      </div>
    </div>
  );
}

function MockPhone() {
  return (
    <div className="absolute inset-0 bg-[#F4F5FB]" aria-hidden="true">
      <div className="flex h-14 items-center border-b border-[#E1E3EF] bg-white px-[18px]">
        <span className="text-xs font-bold tracking-[.1em]">MADE2FOUND</span>
      </div>
      <div className="grid gap-3.5 p-[18px]">
        <div className={`h-5 w-1/2 ${bar}`} />
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-[110px] rounded-2xl border border-[#E1E3EF] bg-white" />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-around border-t border-[#E1E3EF] bg-white">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={`h-3.5 w-3.5 rounded ${index === 0 ? "bg-[#6D49E0]" : "bg-[#C9CCE0]"}`} />
        ))}
      </div>
    </div>
  );
}

export function AnnouncementPreview({
  display,
  title,
  body,
  ctaLabel,
}: {
  display: AnnouncementDisplay;
  title: string;
  body: string;
  ctaLabel: string | null;
}) {
  const t = useTranslations("admin.announcements");
  const tn = useTranslations("notices.announcements");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const frame = device === "desktop" ? DESKTOP : PHONE;
  const seg = (on: boolean) =>
    `min-h-9 rounded-[9px] px-3.5 text-[13px] font-semibold ${on ? "bg-white text-[#14152B] shadow-sm" : "text-[#4A4D68]"}`;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[17px] font-bold text-slate-950">{t("previewTitle")}</h3>
        <div role="group" aria-label={t("deviceLabel")} className="flex gap-1 rounded-xl bg-[#E6E8F2] p-1">
          <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} className={seg(device === "desktop")}>
            {t("deviceDesktop")}
          </button>
          <button type="button" aria-pressed={device === "phone"} onClick={() => setDevice("phone")} className={seg(device === "phone")}>
            {t("devicePhone")}
          </button>
        </div>
      </div>

      <div className="grid min-h-[22rem] place-items-center overflow-hidden rounded-2xl border border-[#DCDEEC] bg-[#E9EBF5] p-4">
        <div style={{ width: frame.width * frame.scale, height: frame.height * frame.scale }} className="overflow-hidden rounded-xl border border-[#CDD0E2] shadow-[0_10px_30px_rgba(20,21,43,.18)]">
          <div
            // Neu aufbauen, wenn Darstellung oder Geraet wechseln: ein aufgeklapptes Band beginnt wieder zu.
            key={`${display}-${device}`}
            style={{ width: frame.width, height: frame.height, transform: `scale(${frame.scale})`, transformOrigin: "top left" }}
            className="relative overflow-hidden"
          >
            {device === "desktop" ? <MockDesktop /> : <MockPhone />}
            <AnnouncementView
              display={display}
              compact={device === "phone"}
              frame="preview"
              eyebrow={tn("eyebrow")}
              title={title || t("previewPlaceholderTitle")}
              body={body || t("previewPlaceholderBody")}
              ctaLabel={ctaLabel}
              dismissLabel={tn("dismiss")}
              closeLabel={tn("close")}
              readMoreLabel={tn("readMore")}
              lessLabel={tn("less")}
              laterNote={tn("later")}
            />
          </div>
        </div>
      </div>

      <p className="rounded-2xl border border-[#DCDEEC] bg-white px-4 py-3 text-[13px] leading-5 text-[#3C3F5A]">
        {t(`explain.${display}`)}
      </p>
    </div>
  );
}
