import { getTranslations } from "next-intl/server";

/** Die vier Kennzahlen im Ueberblick eines Programm-Teams (Personen, offene Meilensteine, Bezugspersonen, naechstes Update). */
export async function ProgramOverviewTiles({
  memberCount,
  openMilestones,
  contactCount,
  due,
}: {
  memberCount: number;
  openMilestones: number;
  contactCount: number;
  due: string | null;
}) {
  const t = await getTranslations("advisor.teamProgram");
  const tiles: [string, React.ReactNode, React.ReactNode, string][] = [
    [t("tileMembers"), memberCount, <><circle key="m1" cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 6.5a3 3 0 010 5.5M17.5 14.2c2 .5 3.5 2.2 3.5 4.8" /></>, "bg-violet-100 text-violet-700"],
    [t("tileOpenMilestones"), openMilestones, <path key="m2" d="M6 20V4.5M6 5h11l-2.2 3.5L17 12H6" />, "bg-sky-100 text-sky-800"],
    [t("tileContacts"), contactCount, <><circle key="m3" cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" /></>, "bg-emerald-100 text-emerald-800"],
    [t("tileNextUpdate"), due ?? "–", <><rect key="m4" x="4" y="5.5" width="16" height="14" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>, "bg-amber-100 text-amber-800"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map(([label, value, icon, tone]) => (
        <div key={label} className="advisor-card flex items-start gap-3 px-4 py-4">
          <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
          </span>
          <div className="min-w-0">
            <dd className="text-2xl font-bold leading-none tracking-tight text-slate-950">{value}</dd>
            <dt className="mt-1 text-xs leading-5 text-slate-600">{label}</dt>
          </div>
        </div>
      ))}
    </dl>
  );
}
