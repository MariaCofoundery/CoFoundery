import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { getFounderConnections } from "@/features/connections/founderConnectionsData";
import { createClient } from "@/lib/supabase/server";

const CARD =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6";
const LINK =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fconnections");

  const [connections, t] = await Promise.all([
    getFounderConnections(user.id, user.email, supabase),
    getTranslations("teams.connections"),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{t("subtitle")}</p>
          </div>
          <Link href="/discovery" className={LINK}>
            {t("find")}
          </Link>
        </div>
      </header>

      <div className="mt-7 grid gap-6">
        <section className={CARD} aria-labelledby="established-connections-title">
          <h2 id="established-connections-title" className="text-xl font-semibold text-slate-950">
            {t("established.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{t("established.description")}</p>
          {connections.teams.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t("established.empty")}
            </p>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {connections.teams.map((team) => {
                const founderNames = team.members.map(
                  (member, index) => member.displayName ?? t("founderFallback", { index: index + 1 })
                );
                const title = team.name ?? founderNames.join(" + ");
                return (
                  <li key={team.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex -space-x-2">
                        {founderNames.map((name, index) => (
                          <ProfileAvatar
                            key={team.members[index]?.userId ?? name}
                            displayName={name}
                            avatarId={team.members[index]?.avatarId}
                            imageUrl={team.members[index]?.avatarUrl}
                            alt={t("avatarAlt", { name })}
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                            fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 ring-2 ring-white"
                          />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-semibold text-slate-950">{title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {team.teamContext === "existing_team"
                            ? t("contexts.existingTeam")
                            : t("contexts.preFounder")}
                        </p>
                      </div>
                    </div>
                    <Link href={`/teams/${encodeURIComponent(team.id)}`} className={`${LINK} mt-4`}>
                      {t("openTeam")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={CARD} aria-labelledby="potential-connections-title">
          <h2 id="potential-connections-title" className="text-xl font-semibold text-slate-950">
            {t("potential.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{t("potential.description")}</p>
          {connections.potentialConnections.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t("potential.empty")}
            </p>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {connections.potentialConnections.map((connection) => (
                <li
                  key={`${connection.source}:${connection.id}`}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      {connection.counterpartName ?? t("founderUnknown")}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {connection.teamContext === "existing_team"
                        ? t("contexts.existingTeam")
                        : t("contexts.preFounder")}
                      {" · "}
                      {t(`states.${connection.state}.${connection.direction}`)}
                    </p>
                  </div>
                  <Link href={connection.href} className={LINK}>
                    {connection.state === "request_pending" ? t("respond") : t("continue")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
