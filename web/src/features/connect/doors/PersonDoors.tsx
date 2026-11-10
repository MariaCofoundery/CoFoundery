import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Door } from "@/features/connect/doors/doorCatalog";
import { doorMeta, doorTitle } from "@/features/connect/doors/doorLabels";

/** Die Tueren einer Person auf ihrer Profilseite, jede mit "Vorstellung anfragen" (oder dem Hinweis, dass sie pausiert sind). */
export async function PersonDoors({ userId, doors, card, label }: { userId: string; doors: (Door & { doorsOpen: boolean })[]; card: string; label: string }) {
  const t = await getTranslations("connect.doors");
  const tt = (key: string, values?: Record<string, string | number>) => t(key, values);
  if (doors.length === 0) return null;
  return (
    <section className={`${card} mt-4`} aria-labelledby="person-doors">
      <h2 id="person-doors" className={label}>{t("person.title")}</h2>
      <ul className="mt-2 grid gap-2">
        {doors.map((door) => (
          <li key={door.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <span className="min-w-0 flex-1">
              <b className="block text-[15px] text-slate-950">{doorTitle(tt, door)}</b>
              <span className="block text-[13px] text-slate-700">{[doorMeta(tt, door), t(`closeness.${door.closeness}.label`)].filter(Boolean).join(" · ")}</span>
              {door.note ? <span className="block text-[13px] text-slate-600">„{door.note}“</span> : null}
            </span>
            {door.doorsOpen ? <Link href={`/connect/people/${userId}/contact?tuer=${door.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-[#6D49E0] px-4 text-sm font-semibold text-white hover:bg-[#5B36D6]">{t("card.ask")}</Link> : <span className="text-[13px] font-semibold text-slate-600">{t("card.paused")}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
