import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccountDeletionNoticeList } from "@/features/account/AccountDeletionNoticeList";
import { getAccountDeletionNotices } from "@/features/account/accountDeletionNotices";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { getFounderConnections } from "@/features/connections/founderConnectionsData";
import { TeamDetailsEditor } from "@/features/teams/TeamDetailsEditor";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const CARD = "rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-7";
const BUTTON_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";
const LINK = `inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 ${BUTTON_FOCUS}`;
const PRIMARY = `brand-cta inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold ${BUTTON_FOCUS}`;

/**
 * Teams & Verbindungen - fuer ein Team genauso wie fuer viele.
 *
 *   ein Team     ein grosser Hauptblock: Name, Beschreibung, direkte Wege
 *   mehrere      Karten nebeneinander
 *   keines       ein ruhiger Startblock
 *
 * „Kennenlernen" steht darunter und ist eine andere Sache als ein Team:
 * Paare, die sich noch pruefen, haben (noch) keinen gemeinsamen Arbeitsraum.
 * Eine offene Antwort ist hervorgehoben und oben gezaehlt - sie ist das
 * Einzige hier, worauf ein Mensch wartet.
 */
export default async function ConnectionsPage({ searchParams }: { searchParams?: Promise<{ team?: string }> }) {
  const query = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=%2Fconnections");

  const [connections, deletionNotices, t, tNav] = await Promise.all([
    getFounderConnections(user.id, user.email, supabase),
    // Hier ist die Stelle, an der etwas fehlt: Wer sich geloescht hat, stand
    // vorher in dieser Liste. Dass jemand weg ist, faellt genau hier auf.
    getAccountDeletionNotices(supabase, ["founder_connection", "founder_advisor"]),
    getTranslations("teams.connections"),
    getTranslations("teams.teamNavigation"),
  ]);

  const teams = connections.teams;
  const waiting = connections.potentialConnections.filter(
    (connection) => connection.state === "request_pending" && connection.direction === "incoming"
  ).length;

  const contextLabel = (context: string | null | undefined) =>
    context === "existing_team" ? t("contexts.existingTeam") : t("contexts.preFounder");

  const avatars = (team: (typeof teams)[number], size: "lg" | "md") => {
    const names = team.members.map((member, index) => member.displayName ?? t("founderFallback", { index: index + 1 }));
    const box = size === "lg" ? "h-12 w-12" : "h-10 w-10";
    return (
      <div className="flex -space-x-2.5">
        {names.map((name, index) => (
          <ProfileAvatar
            key={team.members[index]?.userId ?? name}
            displayName={name}
            avatarId={team.members[index]?.avatarId}
            imageUrl={team.members[index]?.avatarUrl}
            alt={t("avatarAlt", { name })}
            className={`${box} rounded-full object-cover ring-2 ring-white`}
            fallbackClassName={`flex ${box} items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-800 ring-2 ring-white`}
          />
        ))}
      </div>
    );
  };
  const nameOf = (team: (typeof teams)[number]) =>
    team.name?.trim() ||
    team.members.map((member, index) => member.displayName ?? t("founderFallback", { index: index + 1 })).join(" + ");
  const href = (team: (typeof teams)[number], sub = "") => `/teams/${encodeURIComponent(team.id)}${sub}`;

  const title = teams.length > 1 ? t("titleMany") : t("titleOne");
  const subtitle = teams.length > 1 ? t("subtitleMany") : teams.length === 1 ? t("subtitleOne") : t("subtitleNone");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="brand-panel rounded-[28px] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white">{t("eyebrow")}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white">{subtitle}</p>
            {teams.length > 1 || waiting > 0 ? (
              <p className="mt-3 text-sm font-semibold text-white">
                {[
                  teams.length > 1 ? t("countTeams", { count: teams.length }) : null,
                  waiting > 0 ? t("countWaiting", { count: waiting }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          {teams.length > 0 ? (
            <Link href="/invite/new" className={`${PRIMARY} shrink-0`}>
              {t("invite")}
            </Link>
          ) : null}
        </div>
      </header>

      <div className="mt-7 grid gap-7">
        {/* Phase 11.7B: Rueckmeldung nach "Team verlassen". */}
        {query.team === "verlassen" ? (
          <p role="status" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-700">
            {t("leftTeam")}
          </p>
        ) : null}
        <AccountDeletionNoticeList notices={deletionNotices} />

        <section aria-labelledby="established-connections-title" className="grid gap-4">
          <h2 id="established-connections-title" className="sr-only">
            {t("established.title")}
          </h2>

          {teams.length === 0 ? (
            <div className={`${CARD} flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="max-w-xl">
                <h3 className="text-xl font-semibold text-slate-950">{t("start.title")}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{t("established.empty")} {t("start.text")}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {/* Phase 12C.1C: ein ruhiger naechster Schritt statt Sackgasse. */}
                <Link href="/invite/new" className={PRIMARY}>
                  {t("established.emptyCta")}
                </Link>
                <Link href="/discovery" className={LINK}>
                  {t("find")}
                </Link>
              </div>
            </div>
          ) : teams.length === 1 ? (
            <div className={`${CARD} grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  {avatars(teams[0], "lg")}
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
                    {contextLabel(teams[0].teamContext)}
                  </span>
                </div>
                <div className="mt-4">
                  <TeamDetailsEditor
                    teamId={teams[0].id}
                    displayName={nameOf(teams[0])}
                    name={teams[0].name?.trim() || null}
                    description={teams[0].description?.trim() || null}
                    returnTo="/connections"
                  />
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {teams[0].members.map((member, index) => member.displayName ?? t("founderFallback", { index: index + 1 })).join(" · ")}
                </p>
                <Link href={href(teams[0])} className={`${PRIMARY} mt-6`}>
                  {t("openTeam")}
                </Link>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("quickTitle")}</p>
                <ul className="mt-3 grid gap-2">
                  {[
                    { sub: "/workstyle", label: tNav("workstyle") },
                    { sub: "/roles", label: tNav("roles") },
                    { sub: "/setup", label: tNav("setup") },
                  ].map((entry) => (
                    <li key={entry.sub}>
                      <Link href={href(teams[0], entry.sub)} className={`${LINK} w-full justify-between`}>
                        {entry.label}
                        <span aria-hidden className="text-violet-700">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <li key={team.id} className={`${CARD} flex flex-col`}>
                  {avatars(team, "md")}
                  <h3 className="mt-4 break-words text-lg font-semibold text-slate-950">{nameOf(team)}</h3>
                  <p className={`mt-1.5 text-sm leading-6 ${team.description?.trim() ? "text-slate-600" : "text-slate-400"}`}>
                    {team.description?.trim() || t("noDescription")}
                  </p>
                  <p className="mt-3">
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
                      {contextLabel(team.teamContext)}
                    </span>
                  </p>
                  <div className="mt-auto pt-5">
                    <Link href={href(team)} className={LINK}>
                      {t("openTeam")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="potential-connections-title" className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="potential-connections-title" className="text-xl font-semibold text-slate-950">
                {t("potential.title")}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("potential.description")}</p>
            </div>
            {connections.potentialConnections.length > 0 ? (
              <Link href="/discovery" className={LINK}>
                {t("find")}
              </Link>
            ) : null}
          </div>
          {connections.potentialConnections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-4 text-sm text-slate-600">
              <p>{t("potential.empty")}</p>
              <Link href="/discovery" className={`${LINK} mt-3`}>
                {t("potential.emptyCta")}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-3">
              {connections.potentialConnections.map((connection) => {
                const open = connection.state === "request_pending" && connection.direction === "incoming";
                return (
                  <li
                    key={`${connection.source}:${connection.id}`}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                      open ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        {connection.counterpartName ?? t("founderUnknown")}
                      </h3>
                      <p className={`mt-1 text-xs leading-5 ${open ? "font-semibold text-amber-900" : "text-slate-500"}`}>
                        {t(`states.${connection.state}.${connection.direction}`)}
                        {" · "}
                        {contextLabel(connection.teamContext)}
                      </p>
                    </div>
                    <Link href={connection.href} className={open ? PRIMARY : LINK}>
                      {open ? t("answer") : connection.state === "request_pending" ? t("respond") : t("continue")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
