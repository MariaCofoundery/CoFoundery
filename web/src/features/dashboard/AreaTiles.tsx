import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { AreaCard } from "@/features/dashboard/areasModel";

const TONE: Record<AreaCard["key"], { icon: string; chip: string; link: string }> = {
  align: { icon: "bg-[#efeafd] text-[#4a2fb8]", chip: "text-[#4a2fb8]", link: "text-[#5b3df5]" },
  find: { icon: "bg-[#dcf3ef] text-[#0b5d56]", chip: "text-[#0b5d56]", link: "text-[#0b7f6e]" },
  connect: { icon: "bg-[#e3f0fd] text-[#0b4f86]", chip: "text-[#0b4f86]", link: "text-[#0a6db3]" },
  advise: { icon: "bg-[#fdf1de] text-[#8a5a00]", chip: "text-[#8a5a00]", link: "text-[#a16300]" },
};

/**
 * "Deine Bereiche" als vier gleiche Kacheln (Entwurf 17.11.2026): jede mit Farbe, Stand als Wort, einem Satz und einem Knopf. Sie sind die
 * Hauptnavigation der Startseite. Der Stand ist eine Tatsache ("Noch offen", "Angefangen", "Steht"): kein Prozent, kein Gesamtwert, keine Rangfolge.
 */
export async function AreaTiles({ areas, className = "" }: { areas: AreaCard[]; className?: string }) {
  const t = await getTranslations("dashboard.start");
  if (areas.length === 0) return null;
  return (
    <section aria-labelledby="dashboard-areas-title" data-dashboard-areas className={className}>
      <h2 id="dashboard-areas-title" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6d28d9]">{t("areas.title")}</h2>
      <ul className="grid gap-3.5 sm:grid-cols-2">
        {areas.map((area) => (
          <li key={area.key}>
            <Link href={area.href} className="flex h-full min-h-[148px] flex-col gap-1.5 rounded-[20px] border border-[#dcdff0] bg-white p-[18px] transition hover:border-violet-300 hover:shadow-[0_10px_26px_rgba(76,29,149,.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-bold ${TONE[area.key].icon}`}>{t(`areas.${area.key}.name`)[0]}</span>
                <span className="min-w-0">
                  <span className="block text-[19px] font-bold leading-tight text-[#0b1f3a]">{t(`areas.${area.key}.name`)}</span>
                  <span className={`block text-[13px] font-bold ${TONE[area.key].chip}`}>{t(`areas.state.${area.state}`)}</span>
                </span>
              </span>
              <span className="text-[15px] leading-[21px] text-[#4a4d68]">{t(`areas.${area.key}.line`)}</span>
              <span className={`mt-auto pt-1 text-[15px] font-bold ${TONE[area.key].link}`}>
                {t(area.state === "open" ? "areas.setup" : area.state === "started" ? "areas.continue" : "areas.view")} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
