import { getTranslations } from "next-intl/server";
import {
  confirmStrengthProposalAction,
  rejectStrengthProposalAction,
} from "@/features/capability/strengthActions";
import type { StrengthProposal } from "@/features/capability/strengthData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Vorschläge für persönliche Stärken - zum Übernehmen, Umschreiben oder
 * Verwerfen.
 *
 * DIESELBE KARTE AN ZWEI STELLEN: am Ende des Stärken-Interviews und im
 * Bereich "Deine Stärken". `returnTo` sagt, wohin es danach zurückgeht.
 *
 * WAS EINE KARTE ZEIGT: Bezeichnung und Aussage (beide editierbar), die
 * Begründung aus der Situation und das wörtliche Zitat aus der eigenen
 * Antwort. Ältere Vorschläge aus der Capability-Auswertung haben weder
 * Bezeichnung noch Begründung - dann steht dort nur, was es gibt; eine
 * Bezeichnung kann die Person selbst ergänzen.
 *
 * KEINE ZAHL, KEINE RANGFOLGE: Die Reihenfolge ist die, in der die
 * Vorschläge entstanden sind.
 */
export async function StrengthProposalCards({
  proposals,
  returnTo,
}: {
  proposals: StrengthProposal[];
  returnTo?: "/profile/strengths-interview";
}) {
  if (proposals.length === 0) return null;
  const t = await getTranslations("strengths");
  const field =
    "mt-1 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500";

  return (
    <ul className="mt-4 space-y-4">
      {proposals.map((proposal) => (
        <li key={proposal.id} className="rounded-2xl border border-violet-200 bg-white p-4 sm:p-5">
          <form action={confirmStrengthProposalAction}>
            <input type="hidden" name="proposalId" value={proposal.id} />
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                {t("proposals.labelField")}
              </span>
              <input
                type="text"
                name="label"
                defaultValue={proposal.label ?? ""}
                minLength={2}
                maxLength={60}
                required={proposal.label !== null}
                className={`${field} min-h-11 font-semibold`}
              />
            </label>
            <label className="mt-3 block">
              <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                {t("proposals.statementField")}
              </span>
              <textarea
                name="statement"
                defaultValue={proposal.statement}
                minLength={3}
                maxLength={200}
                required
                rows={2}
                className={`${field} py-2 leading-6`}
              />
            </label>

            {proposal.rationale ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                  {t("proposals.rationale")}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{proposal.rationale}</p>
              </div>
            ) : null}

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                {t("proposals.evidence")}
              </p>
              <blockquote className="mt-1 border-l-2 border-violet-300 pl-3 text-sm italic leading-6 text-slate-600">
                „{proposal.quote}“
              </blockquote>
            </div>

            <SubmitButton
              label={t("proposals.confirm")}
              pendingLabel={t("proposals.pending")}
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white"
            />
          </form>
          <form action={rejectStrengthProposalAction} className="mt-2">
            <input type="hidden" name="proposalId" value={proposal.id} />
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            <SubmitButton
              label={t("proposals.reject")}
              pendingLabel={t("proposals.pending")}
              className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
            />
          </form>
        </li>
      ))}
    </ul>
  );
}
