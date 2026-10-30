import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ProgramAccess } from "@/features/advisor/teamProgramData";

type State = "active" | "requested" | "none";

function Pill({ state, t }: { state: State; t: Awaited<ReturnType<typeof getTranslations>> }) {
  const label = state === "active" ? t("accessActive") : state === "requested" ? t("accessRequested") : t("accessNone");
  const tone =
    state === "active" ? "bg-emerald-100 text-emerald-800" : state === "requested" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

/**
 * Freigaben auf einen Blick - ein Stand, keine Bewertung. "Nicht freigegeben"
 * ist eine gueltige Antwort; es gibt keine Gesamtzahl und keine Spalte
 * "Bereitschaft". Sortiert wird nach Teamname.
 */
export async function ProgramAccessTable({
  rows,
  teamNames,
}: {
  rows: ProgramAccess[];
  teamNames: Map<string, string | null>;
}) {
  const t = await getTranslations("advisor.teamProgram");
  const ordered = [...rows].sort((a, b) => (teamNames.get(a.programId) ?? "").localeCompare(teamNames.get(b.programId) ?? ""));
  return (
    <section aria-labelledby="access-title" className="grid gap-4">
      <div>
        <h2 id="access-title" className="text-xl font-semibold text-slate-950">{t("accessTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("accessText")}</p>
      </div>
      {ordered.length === 0 ? (
        <p className="text-sm text-slate-600">{t("accessEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-[.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("accessTeam")}</th>
                <th className="px-4 py-3 font-semibold">{t("accessReview")}</th>
                <th className="px-4 py-3 font-semibold">{t("accessSetup")}</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((row) => (
                <tr key={row.programId} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <Link href={`/advisor/programm/${row.programId}?tab=freigaben`} className="underline-offset-4 hover:underline">
                      {teamNames.get(row.programId) ?? t("unnamedTeam")}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><Pill state={row.teamReview} t={t} /></td>
                  <td className="px-4 py-3"><Pill state={row.founderSetup} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs leading-6 text-slate-600">{t("accessNoneRight")} {t("accessWorkstyle")}</p>
      <p className="text-xs leading-6 text-slate-600">
        {t("accessAsk")}{" "}
        <Link href="/advisor/begleitung?art=gruppen" className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("accessReviewsLink")}</Link>
      </p>
    </section>
  );
}

/** Dieselben Stande fuer ein einzelnes Team, mit dem Programm selbst als erster Zeile. */
export async function TeamAccessList({ access }: { access: ProgramAccess | null }) {
  const t = await getTranslations("advisor.teamProgram");
  const rows: [string, State][] = [
    [t("accessProgram"), "active"],
    [t("accessReview"), access?.teamReview ?? "none"],
    [t("accessSetup"), access?.founderSetup ?? "none"],
  ];
  return (
    <section aria-labelledby="access-one" className="grid gap-3">
      <div>
        <h2 id="access-one" className="text-xl font-semibold text-slate-950">{t("accessTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("accessText")}</p>
      </div>
      <ul className="grid gap-2">
        {rows.map(([label, state]) => (
          <li key={label} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <span className="font-semibold text-slate-900">{label}</span>
            <Pill state={state} t={t} />
          </li>
        ))}
      </ul>
      <p className="text-xs leading-6 text-slate-600">{t("accessNoneRight")} {t("accessWorkstyle")}</p>
      <p className="text-xs leading-6 text-slate-600">
        {t("accessAsk")}{" "}
        <Link href="/advisor/begleitung?art=gruppen" className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("accessReviewsLink")}</Link>
      </p>
    </section>
  );
}
