import Link from "next/link";
import { TeamDetailsEditor } from "@/features/teams/TeamDetailsEditor";
import { getTranslations } from "next-intl/server";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import type { FounderTeamDashboardSummary } from "@/features/teams/founderTeamHomebaseData";
import { AppIcon, IconTile, type IconName, type IconTone } from "@/features/ui/Icons";

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

  const icons: Record<string, { icon: IconName; tone: IconTone }> = {
    understand: { icon: "person", tone: "violet" },
    compare: { icon: "scale", tone: "blue" },
    agree: { icon: "pencil", tone: "amber" },
  };

  return (
    <section id="dashboard-block-path" className="mb-8" aria-labelledby="dashboard-path-title">
      <h2 id="dashboard-path-title" className="text-lg font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("lead")}</p>
      <div className="relative mt-4">
        {/* Die Linie verbindet die drei Stationen (ab md nebeneinander). */}
        <div aria-hidden="true" className="absolute inset-x-16 top-[42px] hidden border-t-2 border-dashed border-slate-300 md:block" />
        <ol className="relative grid gap-3 md:grid-cols-3">
          {stages.map((stage, index) => (
            <li key={stage.key}>
              <Link
                href={stage.href}
                className={`flex h-full flex-col gap-2 rounded-2xl border bg-white p-5 transition hover:border-slate-300 ${
                  stage.active ? "border-violet-400 shadow-[0_10px_30px_rgba(109,73,224,0.14)]" : "border-slate-200"
                }`}
              >
                <span className="flex items-center gap-3">
                  <IconTile name={icons[stage.key].icon} tone={icons[stage.key].tone} />
                  <span className="text-base font-semibold text-slate-950">
                    <span className="sr-only">{index + 1}. </span>
                    {t(`${stage.key}.title`)}
                  </span>
                </span>
                <span className="text-sm leading-6 text-slate-600">{t(`${stage.key}.text`)}</span>
                <span className={`mt-auto self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip[stage.state]}`}>{stage.label}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * „Das kannst du auch": Bereiche, die die Person noch nicht nutzt - Find,
 * Connect und die Begleitung (Advisor). Nur Wegweiser, nie eine Aufgabe. Ist
 * alles schon in Gebrauch, steht hier nichts.
 */
export async function DashboardAreas({
  showFind,
  showConnect,
  showAdvisor,
}: {
  showFind: boolean;
  showConnect: boolean;
  showAdvisor: boolean;
}) {
  const t = await getTranslations("dashboard.areas");
  const cards = [
    ...(showFind ? [{ key: "find", icon: "search" as const, tone: "violet" as const, href: "/discovery" }] : []),
    ...(showConnect ? [{ key: "connect", icon: "network" as const, tone: "blue" as const, href: "/connect" }] : []),
    // Die Rolle ergaenzt man selbst im Profil - eine Selbstfreischaltung gibt es hier nicht.
    ...(showAdvisor ? [{ key: "advisor", icon: "shield" as const, tone: "teal" as const, href: "/profile?step=identity#roles" }] : []),
  ];
  if (cards.length === 0) return null;
  return (
    <section id="dashboard-block-areas" className="mb-8" aria-labelledby="dashboard-areas-title">
      <h2 id="dashboard-areas-title" className="text-lg font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("lead")}</p>
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <li key={card.key} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
            <IconTile name={card.icon} tone={card.tone} />
            <h3 className="mt-4 text-base font-semibold text-slate-950">{t(`cards.${card.key}.title`)}</h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">{t(`cards.${card.key}.text`)}</p>
            <Link href={card.href} className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-sm font-semibold text-violet-700 hover:underline">
              {t(`cards.${card.key}.cta`)}
              <AppIcon name="arrow" className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
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
      <div className="flex items-center gap-2.5">
        <IconTile name="team" tone="teal" size="sm" />
        <h2 className="text-[15px] font-semibold text-slate-600">{t("title")}</h2>
      </div>
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
          <TeamDetailsEditor
            teamId={current.id}
            displayName={nameOf(current)}
            name={current.name?.trim() || null}
            description={current.description?.trim() || null}
            returnTo={`/dashboard?team=${encodeURIComponent(current.id)}`}
          />
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
  const deepen: Record<"tradeoffs" | "strengths", { icon: IconName; tone: IconTone }> = {
    tradeoffs: { icon: "scale", tone: "amber" },
    strengths: { icon: "chat", tone: "teal" },
  };
  return (
    <section id="dashboard-block-deepen" className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" aria-labelledby="dashboard-deepen-title">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 id="dashboard-deepen-title" className="text-lg font-semibold text-slate-950">{t("title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("lead")}</p>
        <ul className="mt-3">
          {(["tradeoffs", "strengths"] as const).map((key) => (
            <li key={key} className="border-t border-slate-100">
              <Link href="/fragebogen" className="flex items-start gap-4 py-3.5">
                <IconTile name={deepen[key].icon} tone={deepen[key].tone} />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-slate-950">{t(`${key}.title`)}</span>
                  <span className="block text-sm text-slate-600">{t(`${key}.text`)}</span>
                </span>
                <span className="whitespace-nowrap pt-1 text-sm font-semibold text-violet-700">{t("view")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2.5 rounded-3xl border border-violet-200 bg-violet-50 p-6">
        <IconTile name="lock" tone="violet" />
        <h2 className="text-lg font-semibold text-slate-950">{t("privacy.title")}</h2>
        <p className="text-sm leading-6 text-slate-700">{t("privacy.text")}</p>
        <Link href="/datenschutz" className="mt-auto font-semibold text-violet-700 hover:underline">{t("privacy.link")}</Link>
      </div>
    </section>
  );
}
