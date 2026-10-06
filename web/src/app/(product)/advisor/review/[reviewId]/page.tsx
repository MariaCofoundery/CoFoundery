import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlignmentSideBySide } from "@/features/advisor/AlignmentSideBySide";
import { AdvisorNotebook } from "@/features/advisor/AdvisorNotebook";
import { getAdvisorFollowUpFor, getAdvisorNoteFor } from "@/features/advisor/notebookData";
import { getTeamReviewDetail } from "@/features/advisor/teamReviewDetailData";
import { CapabilityTeamReadoutView } from "@/features/capability/CapabilityTeamReadoutView";
import { getRequestLocale } from "@/i18n/getLocale";
import { isActiveReviewState, parseTeamReviewState } from "@/features/access/accessStateModel";
import { AdvisorReviewUnavailable, ReviewTeamContext } from "@/features/advisor/AdvisorReviewState";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Die gemeinsame Auswertung.
 *
 * SIE GIBT ES NUR, WEIL ALLE ZUGESTIMMT HABEN. Ohne aktive Zustimmung aller
 * Beteiligten liefert `getTeamReviewDetail` nichts, und diese Seite antwortet
 * mit 404 - nicht mit einem Hinweis "noch nicht freigegeben". Ein Hinweis
 * waere eine Auskunft darueber, dass es diese Anfrage gibt und wie sie
 * ausgegangen ist; das geht nur die Beteiligten etwas an.
 *
 * Phase 12C.1C: Zu den Beteiligten gehoert der anfragende Advisor selbst. Er
 * bekommt einen erklaerenden Zustand (beendet, wartet, Organisation) - ohne
 * Angabe, WER abgelehnt oder zurueckgezogen hat. Alle anderen weiter 404.
 *
 * ---------------------------------------------------------------------------
 * ZWEI TEILE, UND BEIDE STELLEN NEBENEINANDER
 * ---------------------------------------------------------------------------
 *
 *   DIE ROLLENLAGE - wer welche Bereiche verantworten moechte, wo sich das
 *   ueberschneidet, wo niemand steht. Dasselbe Bauteil wie unter
 *   /teams/<id>/roles: Ein Accelerator bekommt keine reichhaltigere
 *   Sonderansicht als das Team von sich selbst.
 *
 *   DIE SELBSTBILDER - die Dimensionen der Beteiligten auf denselben Achsen.
 *   Nebeneinander, nicht verrechnet: kein Passungswert, kein Abstand in
 *   Zahlen, keine Reihenfolge nach Aehnlichkeit.
 *
 * WARUM KEIN VERGLEICHSTEXT. Das Produkt kann vergleichende Texte erzeugen -
 * der Beziehungsreport tut es. Der ist aber fuer zwei Menschen gebaut, die
 * sich fuereinander entschieden haben und gemeinsam hineinschauen. Derselbe
 * Text vor jemandem, der ueber Aufnahme entscheidet, liest sich anders: aus
 * "daran koennt ihr arbeiten" wird "daran wird es scheitern". Die Deutung
 * bleibt deshalb dem Gespraech ueberlassen.
 */
export default async function AdvisorTeamReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ reviewId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { reviewId } = await params;
  const query = await searchParams;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/advisor/review/${reviewId}`)}`);

  const client = await createClient();
  const anchor = { kind: "review", id: reviewId } as const;
  const [detail, t, locale, note, followUp] = await Promise.all([
    getTeamReviewDetail(client, reviewId),
    getTranslations("advisor.review"),
    getRequestLocale(),
    getAdvisorNoteFor(client, anchor),
    getAdvisorFollowUpFor(client, anchor),
  ]);

  // Phase 12C.1C: Der Zustand des Reviews fuer diesen Advisor. Wer nie Advisor
  // dieses Reviews war, bekommt 'none' - dann bleibt es eine echte 404.
  const reviewState = parseTeamReviewState(
    (await client.rpc("get_advisor_team_review_state", { p_review_id: reviewId })).data
  );
  if (!detail || !isActiveReviewState(reviewState)) {
    return <AdvisorReviewUnavailable state={reviewState} />;
  }

  // Phase 12C.1C: Nur das Team, an das genau DIESER Review gebunden ist - nicht
  // alle Teams, die der Advisor irgendwie lesen darf.
  let boundTeamName: string | null = null;
  if (reviewState.state === "active_with_team") {
    const { data: readableTeams } = await client.rpc("get_workstyle_report_teams");
    boundTeamName =
      ((readableTeams ?? []) as { team_id: string; team_name: string | null }[]).find(
        (team) => team.team_id === reviewState.teamId
      )?.team_name ?? null;
  }
  const names = detail.group?.included.map((person) => person.name) ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <Link
        href="/advisor/group"
        className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
      >
        {t("back")}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {names.length > 0 ? names.join(", ") : t("untitled")}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("intro")}</p>

      <ReviewTeamContext state={reviewState} teamName={boundTeamName} subjectUserIds={detail.subjectUserIds} />

      {/* ------------------------------------------------------------------
          Die Rollenlage.
          ------------------------------------------------------------------ */}
      {detail.group ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-950">{t("rolesTitle")}</h2>

          {detail.group.omitted.length > 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
              {t("rolesOmitted", { count: detail.group.omitted.length })}
            </p>
          ) : null}

          <div className="mt-4">
            <CapabilityTeamReadoutView data={detail.group.data} />
          </div>
        </section>
      ) : (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          {t("noRoles")}
        </p>
      )}

      {/* ------------------------------------------------------------------
          Die Selbstbilder nebeneinander.
          ------------------------------------------------------------------ */}
      {detail.alignment.length >= 2 ? (
        <div className="mt-8">
          <AlignmentSideBySide
            people={detail.alignment}
            locale={locale}
            copy={{
              title: t("alignmentTitle"),
              intro: t("alignmentIntro"),
              noValue: t("alignmentNoValue"),
              basis: t("alignmentBasis"),
            }}
          />
        </div>
      ) : null}

      {/* WER ZUGESTIMMT, ABER NICHT FREIGEGEBEN HAT. Die Teamzustimmung
          entsperrt das Nebeneinanderstellen, nicht die Daten - was von einer
          Person zu sehen ist, entscheidet weiterhin ihre eigene Freigabe. */}
      {detail.withoutAlignment.length > 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
          {t("alignmentMissing", { names: detail.withoutAlignment.join(", ") })}
        </p>
      ) : null}

      {/* WAS DIESE SEITE NICHT TUT - unter dem Ergebnis, weil sie dort
          gelesen wird. */}
      <p className="mt-8 rounded-2xl border border-slate-300 bg-slate-50/80 p-5 text-sm leading-6 text-slate-700">
        {t("notAVerdict")}
      </p>

      <AdvisorNotebook
        anchor={anchor}
        note={note}
        followUp={followUp}
        saved={query.saved}
        error={query.error}
      />
    </main>
  );
}
