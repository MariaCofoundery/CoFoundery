import { getTranslations } from "next-intl/server";
import {
  decideTeamReviewAction,
  revokeTeamReviewAction,
} from "@/features/advisor/teamReviewActions";
import type { TeamReviewRequest } from "@/features/advisor/teamReviewData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * "Sollen wir euch zusammen ansehen?"
 *
 * DAS IST EINE ANDERE FRAGE ALS DIE NACH DEM EIGENEN PROFIL, und sie steht
 * deshalb in einem eigenen Abschnitt. Bei einer Freigabe entscheidet man über
 * seine eigenen Daten. Hier entsteht etwas Neues: eine Aussage über das
 * Verhältnis zwischen Menschen, die es vorher nicht gab und die allen
 * Beteiligten gehört.
 *
 * MIT WEM, STEHT GANZ VORN. Man kann einem Vergleich nicht zustimmen, ohne zu
 * wissen, mit wem verglichen wird - die Namen sind nicht Zusatzinformation,
 * sie sind der Gegenstand der Entscheidung.
 *
 * AUSSTEIGEN BEENDET DAS GANZE, und das steht dabei. Nicht als Warnung,
 * sondern weil es stimmt: Die Auswertung ist die Zusammenstellung; ohne eine
 * Seite gibt es sie nicht mehr. Wer das nicht weiß, traut sich womöglich
 * nicht auszusteigen, weil er den anderen nichts wegnehmen will - dabei ist
 * genau das die Regel, die ihn schützt.
 */
export async function TeamReviewSection({ requests }: { requests: TeamReviewRequest[] }) {
  const t = await getTranslations("account.teamReview");
  const open = requests.filter((request) => request.myDecision === "pending");
  const running = requests.filter(
    (request) => request.status === "active" && request.myDecision === "approved"
  );
  const waiting = requests.filter(
    (request) => request.status === "requested" && request.myDecision === "approved"
  );

  if (requests.length === 0) return null;

  const who = (request: TeamReviewRequest) =>
    request.orgName ?? request.askedByName ?? t("unknownRequester");

  return (
    <section
      id="team-review"
      className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>

      {open.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {open.map((request) => (
            <li
              key={request.reviewId}
              className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
            >
              {/* MIT WEM - ganz vorn, weil es der Gegenstand der Entscheidung
                  ist und nicht ein Detail. */}
              <p className="text-sm font-semibold text-slate-950">
                {t("withWhom", { names: request.otherNames.join(", ") })}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {t("askedByLine", { who: who(request) })}
              </p>
              {request.requestNote ? (
                <blockquote className="mt-2 border-l-2 border-amber-300 pl-3 text-sm italic leading-6 text-slate-700">
                  „{request.requestNote}“
                </blockquote>
              ) : null}
              <p className="mt-2 text-xs leading-5 text-slate-600">{t("whatItMeans")}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={decideTeamReviewAction}>
                  <input type="hidden" name="reviewId" value={request.reviewId} />
                  <input type="hidden" name="approve" value="1" />
                  <SubmitButton
                    label={t("approve")}
                    pendingLabel={t("pending")}
                    className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  />
                </form>
                <form action={decideTeamReviewAction}>
                  <input type="hidden" name="reviewId" value={request.reviewId} />
                  <input type="hidden" name="approve" value="0" />
                  <SubmitButton
                    label={t("decline")}
                    pendingLabel={t("pending")}
                    className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {running.length > 0 || waiting.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {[...running, ...waiting].map((request) => (
            <li
              key={request.reviewId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-950">
                  {t("withWhom", { names: request.otherNames.join(", ") })}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {t("askedByLine", { who: who(request) })}
                  {" · "}
                  {request.status === "active" ? t("stateActive") : t("stateWaiting")}
                </span>
              </span>
              <form action={revokeTeamReviewAction}>
                <input type="hidden" name="reviewId" value={request.reviewId} />
                <SubmitButton
                  label={t("revoke")}
                  pendingLabel={t("pending")}
                  className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                />
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Dass ein Ausstieg das Ganze beendet, gehört hierher und nicht in eine
          Bestätigungsfrage: Wer es vorher weiß, entscheidet freier. */}
      <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
        {t("revokeMeaning")}
      </p>
    </section>
  );
}
