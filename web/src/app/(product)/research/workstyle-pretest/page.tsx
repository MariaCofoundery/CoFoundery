import { currentTeamForInvitation } from "@/features/teams/currentJourneyData";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CURRENT_WORKSTYLE_HREF, CURRENT_WORKSTYLE_VERSION } from "@/features/instruments/workstyle/current";
import { WorkstylePretestV2 } from "@/features/instruments/workstyle/WorkstylePretestV2";
import { WorkstyleProfileFlow } from "@/features/instruments/workstyle/WorkstyleProfileFlow";
import { getFounderTeamHomebase } from "@/features/teams/founderTeamHomebaseData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getMyWorkstylePretest } from "@/features/instruments/workstyle/data";
import { WorkstylePretest } from "@/features/instruments/workstyle/WorkstylePretest";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wie du arbeitest", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function WorkstylePretestPage({ searchParams }: { searchParams: Promise<{ version?: string; invitationId?: string; teil?: string }> }) {
  const query = await searchParams;
  const version = query.version ?? "8.5a-v3";
  if (!["8.5a-v1", "8.5a-v2", "8.5a-v3"].includes(version)) notFound();
  const { data: { user } } = await getRequestUser();
  // Phase 10 - Cutover: Fruehere Fassungen nur noch fuer Menschen, die dort
  // schon eine Teilnahme haben (HISTORICAL). Alle anderen - auch ohne
  // Anmeldung - landen in der aktuellen Fassung.
  if (version !== CURRENT_WORKSTYLE_VERSION && (!user || !(await getMyWorkstylePretest(version)))) {
    redirect(query.invitationId ? `${CURRENT_WORKSTYLE_HREF}&invitationId=${encodeURIComponent(query.invitationId)}` : CURRENT_WORKSTYLE_HREF);
  }
  const teamId = user && query.invitationId ? await currentTeamForInvitation(await createClient(), user.id, query.invitationId) : null;
  // Phase 11.5: Kontext fuer den Abschluss - wer eingeladen hat bzw. wer im Team
  // ist. Nur Namen fuer den Hinweis "Freigaben fuer ... pruefen"; es wird nichts
  // freigegeben.
  const team = user && teamId ? await getFounderTeamHomebase(teamId, user.id, await createClient()).catch(() => null) : null;
  const completionContext = user && query.invitationId
    ? { teamId, partnerNames: (team?.members ?? []).filter(m => m.userId !== user.id).map(m => m.displayName ?? "Founder") }
    : null;
  const research = version === "8.5a-v3" && query.teil === "forschung";
  if (version === "8.5a-v2" || version === "8.5a-v3") {
    const [session, historical, historicalV2] = user ? await Promise.all([getMyWorkstylePretest(version), getMyWorkstylePretest("8.5a-v1"), version === "8.5a-v3" ? getMyWorkstylePretest("8.5a-v2") : Promise.resolve(null)]) : [null, null, null];
    return <main lang="de" className="mx-auto max-w-2xl px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <h1 className="text-3xl font-semibold">{research ? "Forschung zum Arbeitsprofil" : "Wie arbeitest du eigentlich?"}</h1>
      {teamId && <p className="mt-4"><Link className="underline" href={`/teams/${teamId}/workstyle`}>Zurück zu eurem Zusammenspiel</Link> · Die Teilnahme erteilt keine Teamfreigabe.</p>}
      {/* Phase 11.6: Aktuelle Fassung - Arbeitsprofil (29 Core) und freiwillige
          Forschung getrennt; fruehere Fassung 8.5a-v2 unveraendert. */}
      {user ? (version === "8.5a-v3"
        ? <WorkstyleProfileFlow key={research ? "research" : "profile"} part={research ? "research" : "profile"} initialSession={session} context={completionContext} />
        : <WorkstylePretestV2 key={version} version={version} initialSession={session} context={completionContext} />)
        : <div className="mt-6 space-y-4"><p>In den nächsten Fragen geht es um ganz unterschiedliche Situationen aus dem Arbeitsalltag – um Entscheidungen, Zusammenarbeit, offene Fragen und die Art, wie du Dinge angehst.</p><p>Antworte so, wie es bei dir meistens wirklich läuft. Nicht so, wie es im Idealfall sein sollte.</p><p>Es gibt keine richtigen oder falschen Antworten.</p><Link className="underline" href={`/login?next=${encodeURIComponent(`/research/workstyle-pretest?version=${version}${research ? "&teil=forschung" : ""}`)}`}>Anmelden und loslegen</Link></div>}
      {historicalV2 && !historicalV2.withdrawn_at && <p className="mt-8"><Link className="underline" href="/research/workstyle-pretest?version=8.5a-v2">Vorherige Teilnahme öffnen</Link></p>}
      {historical && !historical.withdrawn_at && <p className="mt-8"><Link className="underline" href="/research/workstyle-pretest?version=8.5a-v1">Frühere Teilnahme öffnen</Link></p>}
    </main>;
  }
  return <main lang="de" className="mx-auto max-w-3xl px-4 py-10 text-slate-900">
    <p className="text-sm font-semibold text-violet-700">Forschung · Entwicklungsfassung 8.5a-v1</p>
    <h1 className="mt-2 text-3xl font-semibold">Wie arbeitest du als Founder?</h1>
    <p className="mt-4 leading-7">20 gemeinsame Fragen zu deiner Arbeitsweise, danach 5–6 zusätzliche Forschungsfragen. Es gibt keine richtigen oder falschen Antworten und keinen Matchscore.</p>
    {user ? <WorkstylePretest initialSession={await getMyWorkstylePretest()} /> : <p className="mt-6"><Link className="underline" href="/login?next=%2Fresearch%2Fworkstyle-pretest%3Fversion%3D8.5a-v1">Anmelden und den Pretest kennenlernen</Link>. Vor der Teilnahme entscheidest du separat über die Forschungseinwilligung.</p>}
  </main>;
}
