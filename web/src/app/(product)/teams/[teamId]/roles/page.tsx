import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ComponentMatrix } from "@/features/reporting/workstyle/ComponentMatrix";
import "@/features/reporting/workstyle/report.css";
import { getTeamCapabilityForTeam } from "@/features/capability/capabilityTeamData";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { getFounderTeamHomebase } from "@/features/teams/founderTeamHomebaseData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Rollen und Zuständigkeiten im Team.
 *
 * GEWUENSCHT AM 21.09.2026: "Dass dann die ganzen Rollen und
 * Verantwortlichkeiten von dem Founder-Team gut gezeigt werden können [...]
 * und zum Beispiel wenn dann auffällt, ey, euch beiden fehlt HR oder Finance."
 *
 * WARUM IM TEAM UND NICHT IM PROFIL: Es ist eine Aussage über mehrere
 * Menschen. Im eigenen Profil stünde sie an einem Ort, an dem man allein ist -
 * und der Paarvergleich unter `/profile/compare/[userId]` bleibt bestehen: Er
 * ist die Sicht auf EINE Beziehung, diese hier die auf das ganze Team.
 *
 * WAS SIE NICHT KANN, und das steht auch auf der Seite: Sie zeigt nur, was
 * jedes Mitglied freigegeben hat. Wer seine Freigabestufe auf "privat" oder
 * "nur Bereiche" gesetzt hat, erscheint hier ohne Tiefe - und eine dünne Karte
 * ist dann eine Auskunft über Einstellungen, nicht über das Team.
 */
export default async function TeamRolesPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const pathname = `/teams/${encodeURIComponent(teamId)}/roles`;

  const [supabase, userResult] = await Promise.all([createClient(), getRequestUser()]);
  const user = userResult.data.user;
  if (!user) redirect(`/login?next=${encodeURIComponent(pathname)}`);

  const team = await getFounderTeamHomebase(teamId, user.id, supabase);
  if (!team) notFound();

  const t = await getTranslations("capability");
  const [data, teamLabel] = await Promise.all([
    getTeamCapabilityForTeam(supabase, teamId, user.id, t("team.unnamedMember")),
    getTeamLabel(supabase, teamId),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <TeamPageHeader teamId={teamId} active="roles" title={t("team.title")} teamLabel={teamLabel} />
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t("team.text")}</p>

      {!data || data.contributing === 0 ? (
        /* NICHTS GETEILT IST KEIN FEHLER UND KEINE LEERE SEITE. Es ist der
           Normalfall am Anfang, und es hat genau zwei Ursachen - noch keine
           Angaben, oder noch keine Teamfreigabe fuer dieses Team. Beide Wege
           stehen deshalb dabei. */
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-slate-900">{t("team.emptyTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("team.emptyText")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/profile/interview"
              className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold text-slate-900"
            >
              {t("team.emptyInterview")}
            </Link>
            <Link
              href={`/teams/${encodeURIComponent(teamId)}#teamfreigabe`}
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800"
            >
              {t("team.emptyDisclosure")}
            </Link>
          </div>
        </section>
      ) : (
        <div className="ws-report mt-6">
          {/* Phase 11.7B.1: dieselbe Darstellung wie im Teambericht. */}
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {t("team.teamBasis", { contributing: data.contributing, members: data.memberCount, withDepth: data.withDepth })}
          </p>
          <ComponentMatrix people={data.people} areas={data.areas} heading={false} />
        </div>
      )}
    </main>
  );
}
