import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import type { FounderTeamDashboardSummary } from "@/features/teams/founderTeamHomebaseData";

/**
 * Orientierung auf der Startseite: „Euer Weg" und die beiden anderen Bereiche.
 *
 * Beides beantwortet eine Frage, die die Startseite bisher nicht stellte: Wo stehe ich auf dem Weg, und was
 * gibt es ausser Align noch? Es sind Wegweiser, keine Aufgaben - die stehen darunter („Was gerade ansteht").
 *
 *   Euer Weg   Ich verstehen -> Uns vergleichen -> Vereinbaren. Der erste Schritt hat einen Zustand (Profil
 *              offen/begonnen/steht), der zweite „hier geht es weiter", sobald es ein Team gibt. Kein
 *              Prozent, kein „x von y".
 *   Bereiche   Find und Connect als ruhiger Streifen mit dem Verlauf der Marke - nie als Aufgabe.
 */
export type ProfileStage = "open" | "started" | "done";

export async function DashboardPath({ profile, hasTeam, teamId = null }: { profile: ProfileStage; hasTeam: boolean; teamId?: string | null }) {
  const t = await getTranslations("dashboard.path");
  const chip = {
    done: "bg-emerald-100 text-emerald-800",
    here: "bg-violet-100 text-violet-800",
    quiet: "bg-slate-100 text-slate-600",
  } as const;
  const stages = [
    {
      key: "understand",
      href: "/me/profile",
      state: profile === "done" ? ("done" as const) : profile === "started" ? ("here" as const) : ("quiet" as const),
      label: profile === "done" ? t("state.done") : profile === "started" ? t("state.started") : t("state.open"),
      active: profile !== "done",
    },
    {
      key: "compare",
      href: teamId ? `/teams/${encodeURIComponent(teamId)}` : "/connections",
      state: hasTeam ? ("here" as const) : ("quiet" as const),
      label: hasTeam ? t("state.here") : t("state.open"),
      active: profile === "done" && hasTeam,
    },
    { key: "agree", href: teamId ? `/teams/${encodeURIComponent(teamId)}/setup` : "/connections", state: "quiet" as const, label: t("state.inTeam"), active: false },
  ];

  return (
    <section id="dashboard-block-path" className="mb-8" aria-labelledby="dashboard-path-title">
      <h2 id="dashboard-path-title" className="text-lg font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("lead")}</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {stages.map((stage, index) => (
          <li key={stage.key}>
            <Link
              href={stage.href}
              className={`flex h-full flex-col gap-2 rounded-2xl border bg-white p-5 transition hover:border-slate-300 ${
                stage.active ? "border-violet-300" : "border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-800">{index + 1}</span>
                <span className="text-base font-semibold text-slate-950">{t(`${stage.key}.title`)}</span>
              </span>
              <span className="text-sm leading-6 text-slate-600">{t(`${stage.key}.text`)}</span>
              <span className={`mt-auto self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip[stage.state]}`}>{stage.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function DashboardAreas({ hasConnect }: { hasConnect: boolean }) {
  const t = await getTranslations("dashboard.areas");
  return (
    <section id="dashboard-block-areas" className="brand-panel mb-8 flex flex-wrap items-center justify-between gap-5 rounded-[28px] p-6 sm:p-7" aria-labelledby="dashboard-areas-title">
      <div className="max-w-xl">
        <h2 id="dashboard-areas-title" className="text-xl font-semibold">{t("title")}</h2>
        <p className="mt-2 text-sm leading-7 text-white">{t("text")}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/discovery" className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-violet-800">{t("find")}</Link>
        {hasConnect ? (
          <Link href="/connect" className="inline-flex min-h-11 items-center rounded-xl border border-white/60 bg-white/15 px-5 text-sm font-semibold text-white">{t("connect")}</Link>
        ) : null}
      </div>
    </section>
  );
}

/**
 * "Dein Team": zeigt standardmaessig das zuletzt angelegte Team. Wer mehrere hat, waehlt ueber
 * "Andere Teams" - die Auswahl steht nur in der Adresse (?team=), sie wird nirgends gespeichert.
 */
export async function DashboardTeamCard({ teams, selectedTeamId }: { teams: FounderTeamDashboardSummary[]; selectedTeamId: string | null }) {
  const t = await getTranslations("dashboard.teamCard");
  const current = teams.find((team) => team.id === selectedTeamId) ?? teams[0] ?? null;
  const others = teams.filter((team) => team.id !== current?.id);
  const nameOf = (team: FounderTeamDashboardSummary) =>
    team.name?.trim() || team.members.map((member) => member.displayName ?? t("someone")).join(" + ");
  return (
    <div id="dashboard-block-team" className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-[15px] font-semibold text-slate-600">{t("title")}</h2>
      {current ? (
        <>
          <ul className="flex -space-x-2">
            {current.members.map((member) => (
              <li key={member.userId} title={member.displayName ?? undefined}>
                <ProfileAvatar
                  displayName={member.displayName ?? t("someone")}
                  avatarId={member.avatarId}
                  imageUrl={member.avatarUrl}
                  alt={member.displayName ?? t("someone")}
                  className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  fallbackClassName="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-violet-100 text-sm font-semibold text-violet-800"
                />
              </li>
            ))}
          </ul>
          <p className="text-lg font-semibold text-slate-950">{nameOf(current)}</p>
          <p className="text-sm leading-6 text-slate-600">{t("people", { count: current.members.length })}</p>
          <Link href={`/teams/${encodeURIComponent(current.id)}`} className="mt-auto font-semibold text-violet-700 hover:underline">
            {t("open")}
          </Link>
          {others.length > 0 ? (
            <details className="border-t border-slate-200 pt-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">{t("others", { count: others.length })}</summary>
              <ul className="mt-2 space-y-1">
                {others.map((team) => (
                  <li key={team.id}>
                    <Link href={`/dashboard?team=${encodeURIComponent(team.id)}`} className="inline-flex min-h-10 items-center text-sm text-slate-800 underline underline-offset-4">
                      {nameOf(team)}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm leading-6 text-slate-600">{t("none")}</p>
          <Link href="/invite/new" className="mt-auto font-semibold text-violet-700 hover:underline">{t("invite")}</Link>
        </>
      )}
    </div>
  );
}

/** "Zum Vertiefen" und der Hinweis zum Umgang mit Daten - ruhig, zwei Flaechen nebeneinander. */
export async function DashboardDeepen() {
  const t = await getTranslations("dashboard.deepen");
  return (
    <section id="dashboard-block-deepen" className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" aria-labelledby="dashboard-deepen-title">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 id="dashboard-deepen-title" className="text-lg font-semibold text-slate-950">{t("title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("lead")}</p>
        <ul className="mt-3">
          {(["tradeoffs", "strengths"] as const).map((key) => (
            <li key={key} className="border-t border-slate-100">
              <Link href="/fragebogen" className="flex items-start justify-between gap-3 py-3.5">
                <span>
                  <span className="block text-base font-semibold text-slate-950">{t(`${key}.title`)}</span>
                  <span className="block text-sm text-slate-600">{t(`${key}.text`)}</span>
                </span>
                <span className="whitespace-nowrap text-sm font-semibold text-violet-700">{t("view")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2.5 rounded-3xl bg-violet-50 p-6">
        <h2 className="text-lg font-semibold text-slate-950">{t("privacy.title")}</h2>
        <p className="text-sm leading-6 text-slate-700">{t("privacy.text")}</p>
        <Link href="/datenschutz" className="mt-auto font-semibold text-violet-700 hover:underline">{t("privacy.link")}</Link>
      </div>
    </section>
  );
}
