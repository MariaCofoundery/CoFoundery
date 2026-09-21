import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CapabilityTeamReadoutView } from "@/features/capability/CapabilityTeamReadoutView";
import { getTeamCapabilityReadout } from "@/features/capability/capabilityTeamData";
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";
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

  const [t, navigationT, data] = await Promise.all([
    getTranslations("capability"),
    getTranslations("teams.teamNavigation"),
    getTeamCapabilityReadout(supabase, teamId, user.id),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href={`/teams/${encodeURIComponent(teamId)}`}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← {t("team.backToTeam")}
      </Link>

      <FounderTeamNavigation
        teamId={teamId}
        active="roles"
        labels={{
          ariaLabel: navigationT("ariaLabel"),
          context: navigationT("context"),
          overview: navigationT("overview"),
          setup: navigationT("setup"),
          library: navigationT("library"),
          alignment: navigationT("alignment"),
          roles: navigationT("roles"),
        }}
      />

      <p className="mt-6 text-xs uppercase tracking-[.18em] text-slate-500">{t("eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {t("team.title")}
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t("team.text")}</p>

      {!data || data.contributing === 0 ? (
        /* NICHTS FREIGEGEBEN IST KEIN FEHLER UND KEINE LEERE SEITE. Es ist der
           Normalfall am Anfang, und es hat genau zwei Ursachen - noch keine
           Angaben, oder die Freigabestufe. Beide Wege stehen deshalb dabei. */
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
              href="/profile#freigabe"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800"
            >
              {t("team.emptyDisclosure")}
            </Link>
          </div>
        </section>
      ) : (
        <div className="mt-6">
          <CapabilityTeamReadoutView data={data} />
        </div>
      )}
    </main>
  );
}
