import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportViewV21 } from "@/features/instruments/v21/ReportViewV21";
import { WorkMap } from "@/features/instruments/align/AlignMaps";
import { getScopeReport } from "@/features/instruments/align/reportData";
import { getShareState } from "@/features/instruments/align/shareData";
import { ShareForm } from "@/features/instruments/align/ShareForm";
import { getItemsV22 } from "@/features/instruments/align/registries";
import { FOUNDER_PROFILE } from "@/features/instruments/align/registries";
import { getRequestUser } from "@/lib/supabase/server";

/**
 * Die eigenen Antworten zum Arbeitsprofil.
 *
 * KEINE PUNKTZAHL UND KEIN BALKEN. Was hier steht, sind die Antworten - kein
 * Mittelwert über mehrere Fragen. „4.4 von 5“ wäre eine Behauptung über eine
 * Skala, die es nicht gibt.
 */
export default async function ProfileAnswersPage() {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/profil/antworten")}`);
  }

  const report = await getScopeReport(auth.user.id, "founder_profile");
  const teilen = await getShareState(auth.user.id, "founder_profile", null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Testfassung
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">Wie du arbeitest</h1>
      <p className="mt-4 text-slate-700">
        Das ist, was du geantwortet hast — keine Auswertung, keine Punktzahl, kein
        Vergleich mit anderen.
      </p>
      <p className="mt-2 text-sm text-slate-500">{FOUNDER_PROFILE.validity}</p>

      {!report ? (
        <p className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
          Hier steht noch nichts.{" "}
          <Link href="/founder-alignment/profil" className="underline">
            Zum Fragebogen
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10">
          <p className="mb-4 text-sm text-slate-500">
            {report.answered} von {report.of} Fragen beantwortet
            {report.submittedAt && (
              <> · abgegeben am {new Date(report.submittedAt).toLocaleDateString("de-DE")}</>
            )}
          </p>
          {/* DAS BILD VOR DER LISTE. Es zeigt dieselben Antworten kompakt -
              wer den Ueberblick hat, liest die Liste anders als jemand, der
              sich durch sechzehn Kaesten arbeitet. */}
          <div className="mb-8">
            <WorkMap sections={report.sections} />
          </div>

          <ReportViewV21
            sections={report.sections}
            marked={report.marked}
            canMark
            markScope="founder_profile"
          />

          {/* UNTER den Antworten: Wer bis hierher scrollt, hat gesehen, was er
              teilt. */}
          <div className="mt-10">
            <ShareForm
              scope="founder_profile"
              ventureId={null}
              label="Dein Arbeitsprofil"
              recipients={teilen.recipients}
              hiddenByRecipient={teilen.hiddenByRecipient}
              items={getItemsV22("founder_profile").map((item) => ({
                itemId: item.itemId,
                prompt: item.prompt,
              }))}
            />
          </div>
        </div>
      )}
    </main>
  );
}
