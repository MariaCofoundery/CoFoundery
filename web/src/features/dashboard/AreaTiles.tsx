import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { AreaCard } from "@/features/dashboard/areasModel";

const TONE: Record<AreaCard["key"], { icon: string; chip: string; link: string; bar: string }> = {
  align: { icon: "bg-[#efeafd] text-[#4a2fb8]", chip: "text-[#4a2fb8]", link: "text-[#5b3df5]", bar: "bg-[#5b3df5]" },
  find: { icon: "bg-[#dcf3ef] text-[#0b5d56]", chip: "text-[#0b5d56]", link: "text-[#0b7f6e]", bar: "bg-[#14a58f]" },
  connect: { icon: "bg-[#e3f0fd] text-[#0b4f86]", chip: "text-[#0b4f86]", link: "text-[#0a6db3]", bar: "bg-[#0a88c2]" },
  advise: { icon: "bg-[#fdf1de] text-[#8a5a00]", chip: "text-[#8a5a00]", link: "text-[#a16300]", bar: "bg-[#e08a1e]" },
};

/**
 * "Deine Bereiche" (Entwurf 17.11.2026, Version 2): vier Kacheln. Genutzte Bereiche stehen zuerst, mit Stand in Worten (was fertig ist, was fehlt,
 * ob das Profil sichtbar ist) und einem Knopf. Bereiche, in denen noch nichts passiert ist, bleiben ruhig: gestrichelter Rand, ein Satz als Einladung,
 * "Einrichten". Der Stand ist eine Tatsache - kein Prozent, kein Gesamtwert, keine Rangfolge. Bei Align zeigen vier Striche, wie viele Teile fertig sind
 * (nur fuer das Auge; fuer Screenreader steht es als Satz da).
 */
export async function AreaTiles({ areas, className = "" }: { areas: AreaCard[]; className?: string }) {
  const t = await getTranslations("dashboard.start");
  if (areas.length === 0) return null;
  const used = areas.filter((area) => area.chosen);
  const quiet = areas.filter((area) => !area.chosen);

  const status = (area: AreaCard): string => {
    if (area.key === "align") {
      const names = (keys: readonly string[]) => keys.map((key) => t(`stand.parts.${key}`)).join(", ");
      return area.missingParts.length === 0 ? t("areas.status.align.all") : area.doneParts.length === 0 ? t("areas.status.align.none") : t("areas.status.align.some", { done: names(area.doneParts), missing: names(area.missingParts) });
    }
    if (area.key === "advise") return t("areas.status.advise.started");
    return t(`areas.status.${area.key}.${area.detail ?? "draft"}`);
  };

  return (
    <section aria-labelledby="dashboard-areas-title" data-dashboard-areas className={className}>
      <h2 id="dashboard-areas-title" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6d28d9]">{t("areas.title")}</h2>
      <ul className="grid gap-3.5 sm:grid-cols-2">
        {used.map((area) => (
          <li key={area.key}>
            <Link href={area.href} className="flex h-full min-h-[156px] flex-col gap-2 rounded-[20px] bg-white p-[18px] shadow-[0_1px_0_#ebe8f7] transition hover:shadow-[0_10px_26px_rgba(76,29,149,.10)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-bold ${TONE[area.key].icon}`}>{t(`areas.${area.key}.name`)[0]}</span>
                <span className="min-w-0">
                  <span className="block text-[19px] font-bold leading-tight text-[#0b1f3a]">{t(`areas.${area.key}.name`)}</span>
                  <span className={`block text-[13px] font-bold ${TONE[area.key].chip}`}>{t(`areas.state.${area.state}`)}</span>
                </span>
              </span>
              <span className="text-[15px] leading-[21px] text-[#33325e]">{status(area)}</span>
              {area.key === "align" ? (
                <span className="flex gap-1" role="img" aria-label={t("areas.partsDone", { done: area.doneParts.length })}>
                  {[0, 1, 2, 3].map((i) => <span key={i} aria-hidden="true" className={`h-1.5 w-[22px] rounded-full ${i < area.doneParts.length ? TONE.align.bar : "bg-[#d9d6ea]"}`} />)}
                </span>
              ) : null}
              <span className={`mt-auto pt-1 text-[15px] font-bold ${TONE[area.key].link}`}>
                {t(area.state === "open" ? "areas.setup" : area.state === "started" ? "areas.continue" : "areas.view")} →
              </span>
            </Link>
          </li>
        ))}
        {quiet.map((area) => (
          <li key={area.key}>
            <Link href={area.href} className="flex h-full min-h-[156px] flex-col gap-2 rounded-[20px] border-2 border-dashed border-[#c9bff0] p-[18px] transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-bold opacity-75 ${TONE[area.key].icon}`}>{t(`areas.${area.key}.name`)[0]}</span>
                <span className="min-w-0">
                  <span className="block text-[19px] font-bold leading-tight text-[#4a4d68]">{t(`areas.${area.key}.name`)}</span>
                  <span className="block text-[13px] font-bold text-[#6b6d85]">{t("areas.notSetUp")}</span>
                </span>
              </span>
              <span className="text-[15px] leading-[21px] text-[#4a4d68]">{t(`areas.${area.key}.also`)}</span>
              <span className={`mt-auto pt-1 text-[15px] font-bold ${TONE[area.key].link}`}>{t("areas.setup")} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
