import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import {
  getProductTeam,
  getProductSnapshot,
} from "@/features/reporting/workstyle/data";
import { saveProductSnapshot } from "@/features/reporting/workstyle/actions";
import { TeamWorkstyleReport } from "@/features/reporting/workstyle/TeamWorkstyleReport";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import type { ProductTeam } from "@/features/reporting/workstyle/model";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Euer Zusammenspiel",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ snapshot?: string; error?: string }>;
}) {
  const { teamId } = await params;
  const query = await searchParams;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/workstyle`)}`);
  const client = await createClient();
  const current = await getProductTeam(client, teamId);
  if (!current) notFound();
  const snapshot = query.snapshot
    ? await getProductSnapshot<ProductTeam>(client, query.snapshot)
    : null;
  if (query.snapshot && (!snapshot || snapshot.input.team_id !== teamId))
    notFound();
  const team = snapshot?.input ?? current;
  return (
    <main className="ws-report mx-auto max-w-6xl px-5 py-10">
      <div className="ws-no-print mb-5">
        <Link href={`/teams/${teamId}`} className="underline">
          Zum Team
        </Link>
      </div>
      <header className="mb-10">
        <p className="text-sm text-slate-500">
          {team !== "not_ready"
            ? (team.team_name ?? "Euer Vorhaben")
            : "Euer Vorhaben"}
        </p>
        <h1 className="mt-2 text-4xl font-semibold">Euer Zusammenspiel</h1>
        <div className="ws-no-print mt-5 flex flex-wrap gap-4">
          <PrintReportButton label="Drucken / als PDF speichern" />
          {team !== "not_ready" && (
            <form action={saveProductSnapshot.bind(null, teamId)}>
              <button className="min-h-11 rounded-lg border px-4">
                Diesen Stand festhalten
              </button>
            </form>
          )}
        </div>
        {query.error && (
          <p role="alert">
            Der Stand konnte nicht gespeichert werden. Bitte lade den Report
            neu.
          </p>
        )}
        {snapshot && (
          <p className="mt-3 text-sm text-slate-500">
            Festgehalten am{" "}
            {new Date(snapshot.generated_at).toLocaleString("de-DE")} ·{" "}
            {snapshot.schema_version}
          </p>
        )}
      </header>
      {team === "not_ready" ? (
        <section>
          <h2 className="text-xl font-semibold">
            Eure Arbeitsprofile sind noch nicht gemeinsam sichtbar
          </h2>
          <p className="mt-3 leading-7">
            Alle Mitglieder benötigen ein abgeschlossenes Arbeitsprofil
            derselben aktuellen Fassung und müssen dessen Core-Antworten für die
            lesende Person freigeben. Eine Einladung allein erteilt keine
            Freigabe.
          </p>
          <Link
            href="/me/profile/workstyle"
            className="mt-4 inline-block underline"
          >
            Eigenes Arbeitsprofil und Freigaben öffnen
          </Link>
        </section>
      ) : (
        <TeamWorkstyleReport team={team} />
      )}
    </main>
  );
}
