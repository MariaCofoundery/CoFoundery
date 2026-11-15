"use client";

import { useTranslations } from "next-intl";
import "@/features/onboarding/explainer.css";

/**
 * Die kleine, stille Erklaerung der vier Bereiche: Align, Find, Connect, Advisor - je ein Bild und ein kurzer Satz.
 *
 * Reine Grafik (SVG und CSS), kein Video: laedt sofort, laeuft bei schlechtem Netz und braucht keine Datei. Sie blockiert
 * nichts; die Seite darunter ist sofort bedienbar. Dieselbe Komponente kann auf der Startseite stehen.
 */
export function AreasExplainer() {
  const t = useTranslations("profile.journey.explainer");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_10px_26px_rgba(15,23,42,.06)]" role="img" aria-label={t("alt")} data-areas-explainer>
      <div className="relative" style={{ height: 150 }} aria-hidden="true">
        <div className="ex-scene ex-s1">
          <svg viewBox="0 0 320 96" width="100%" height="96">
            <circle cx="60" cy="30" r="14" fill="#5b3df5" /><circle cx="260" cy="30" r="14" fill="#0a88c2" />
            <line x1="40" y1="70" x2="280" y2="70" stroke="#d6d9ea" strokeWidth="3" strokeLinecap="round" />
            <circle cx="110" cy="70" r="8" fill="#5b3df5" /><circle cx="195" cy="70" r="8" fill="#0a88c2" />
            <line x1="110" y1="52" x2="110" y2="62" stroke="#5b3df5" strokeWidth="2" /><line x1="195" y1="52" x2="195" y2="62" stroke="#0a88c2" strokeWidth="2" />
          </svg>
          <p className="mt-0.5 text-[15px] leading-[21px] text-slate-900"><strong className="text-violet-800">Align</strong> – {t("align")}</p>
        </div>
        <div className="ex-scene ex-s2">
          <svg viewBox="0 0 320 96" width="100%" height="96">
            <rect x="120" y="14" width="80" height="68" rx="10" fill="#fff" stroke="#c9ccdf" />
            <circle cx="160" cy="38" r="10" fill="#5b3df5" /><rect x="138" y="56" width="44" height="6" rx="3" fill="#d6d9ea" /><rect x="146" y="68" width="28" height="5" rx="2.5" fill="#e4e6f2" />
            <rect x="52" y="24" width="64" height="52" rx="9" fill="#f1ecff" stroke="#d9d2f7" className="ex-slide" />
            <rect x="204" y="24" width="64" height="52" rx="9" fill="#eaf6fb" stroke="#bfe3f1" className="ex-slide" />
          </svg>
          <p className="mt-0.5 text-[15px] leading-[21px] text-slate-900"><strong className="text-violet-800">Find</strong> – {t("find")}</p>
        </div>
        <div className="ex-scene ex-s3">
          <svg viewBox="0 0 320 96" width="100%" height="96">
            <line x1="160" y1="48" x2="70" y2="26" stroke="#c9ccdf" strokeWidth="2" /><line x1="160" y1="48" x2="250" y2="30" stroke="#c9ccdf" strokeWidth="2" /><line x1="160" y1="48" x2="110" y2="80" stroke="#c9ccdf" strokeWidth="2" /><line x1="160" y1="48" x2="230" y2="78" stroke="#c9ccdf" strokeWidth="2" />
            <circle cx="160" cy="48" r="15" fill="#5b3df5" className="ex-pulse" />
            <circle cx="70" cy="26" r="9" fill="#0a88c2" /><circle cx="250" cy="30" r="9" fill="#0a8a68" /><circle cx="110" cy="80" r="9" fill="#d4531a" /><circle cx="230" cy="78" r="9" fill="#c4287c" />
          </svg>
          <p className="mt-0.5 text-[15px] leading-[21px] text-slate-900"><strong className="text-violet-800">Connect</strong> – {t("connect")}</p>
        </div>
        <div className="ex-scene ex-s4">
          <svg viewBox="0 0 320 96" width="100%" height="96">
            <circle cx="60" cy="48" r="15" fill="#5b3df5" />
            <line x1="76" y1="44" x2="150" y2="24" stroke="#c9ccdf" strokeWidth="2" /><line x1="76" y1="48" x2="150" y2="48" stroke="#c9ccdf" strokeWidth="2" /><line x1="76" y1="52" x2="150" y2="74" stroke="#c9ccdf" strokeWidth="2" />
            <rect x="150" y="14" width="96" height="20" rx="10" fill="#fff" stroke="#c9ccdf" /><rect x="150" y="38" width="96" height="20" rx="10" fill="#fff" stroke="#c9ccdf" /><rect x="150" y="62" width="96" height="20" rx="10" fill="#fff" stroke="#c9ccdf" />
          </svg>
          <p className="mt-0.5 text-[15px] leading-[21px] text-slate-900"><strong className="text-violet-800">Advisor</strong> – {t("advise")}</p>
        </div>
      </div>
      <div className="mt-1.5 flex justify-center gap-1.5" aria-hidden="true"><span className="ex-dot" /><span className="ex-dot ex-d2" /><span className="ex-dot ex-d3" /><span className="ex-dot ex-d4" /></div>
    </div>
  );
}
