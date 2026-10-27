import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";
import type { FounderSetupRailGroup, FounderSetupRailState } from "@/features/teams/founderSetupTopicNav";

/**
 * Die Themen als Leiste neben der Themenseite - ein Klick ins naechste Thema
 * statt zurueck zur Liste und wieder hinein.
 *
 * Am Computer links und beim Scrollen stehend, am Handy ein aufklappbares
 * "Alle Themen". Der Zustand steht als Punkt UND als Wort (fuer Lesegeraete),
 * nie als Ampel: ein offenes Thema ist kein Versagen.
 */
const DOT: Record<FounderSetupRailState, string> = {
  open: "border-2 border-slate-400 bg-transparent",
  discussing: "border-2 border-violet-500 bg-violet-100",
  waiting_for_you: "border-2 border-amber-500 bg-amber-100",
  awaiting_others: "border-2 border-sky-500 bg-sky-100",
  settled: "border-2 border-teal-600 bg-teal-600",
};

async function RailList({ teamId, groups, current }: { teamId: string; groups: FounderSetupRailGroup[]; current: FounderSetupItemKey }) {
  const t = await getTranslations("teams.setup");
  return (
    <>
      {groups.map((group) => (
        <div key={group.phase} className="mt-3 first:mt-0">
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#5f5e7a]">{t(`phases.${group.phase}.title`)}</p>
          <ul>
            {group.entries.map((entry) => (
              <li key={entry.key}>
                <Link
                  href={`/teams/${teamId}/setup/${entry.key}`}
                  aria-current={entry.key === current ? "page" : undefined}
                  className={`flex min-h-9 items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition hover:bg-[#f7f6fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] ${entry.key === current ? "bg-[#efeafc] font-semibold text-[#0b1f3a]" : "text-[#2c2b4a]"}`}
                >
                  <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[entry.state]}`} />
                  <span className="min-w-0 flex-1">{t(`items.${entry.key}.title`)}</span>
                  <span className="sr-only">{t(`topic.railState.${entry.state}`)}</span>
                  {entry.state === "waiting_for_you" ? (
                    <span aria-hidden="true" className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">{t("topic.youTag")}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export async function FounderSetupTopicRail({
  teamId,
  groups,
  current,
  position,
  total,
}: {
  teamId: string;
  groups: FounderSetupRailGroup[];
  current: FounderSetupItemKey;
  position: number;
  total: number;
}) {
  const t = await getTranslations("teams.setup");
  const box = "rounded-2xl border border-[#e4e2f0] bg-white p-3";
  return (
    <>
      {/* Handy und schmale Fenster: eingeklappt, damit das Thema oben bleibt. */}
      <details className={`${box} lg:hidden`}>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-1 text-sm font-bold text-[#0b1f3a]">
          <span>{t("topic.allTopics")}</span>
          <span className="font-semibold text-[#5f5e7a]">{t("topic.position", { n: position, total })}</span>
        </summary>
        <nav aria-label={t("topic.railLabel")} className="mt-2"><RailList teamId={teamId} groups={groups} current={current} /></nav>
      </details>
      {/* Computer: feste Leiste. */}
      <nav aria-label={t("topic.railLabel")} className={`${box} sticky top-3 hidden max-h-[calc(100vh-1.5rem)] overflow-y-auto lg:block`}>
        <RailList teamId={teamId} groups={groups} current={current} />
      </nav>
    </>
  );
}
