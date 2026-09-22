import { getTranslations } from "next-intl/server";
import {
  confirmDirectionProposalAction,
  rejectDirectionProposalAction,
} from "@/features/direction/directionStatementActions";
import {
  STATEMENT_MAX_LENGTH,
  STATEMENT_MIN_LENGTH,
} from "@/features/direction/directionInterviewGuide";
import type { DirectionProposalRow } from "@/features/direction/directionProposalData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Was ein Modell vorgeschlagen hat - und was damit passiert.
 *
 * DAS ZITAT STEHT DANEBEN, IMMER. Es ist der Unterschied zwischen "die KI
 * sagt, dir sei X wichtig" und "das hier hast du geschrieben, und daraus
 * könnte X folgen". Die Datenbank hat es gegen die eigene Antwort
 * nachgerechnet, bevor der Vorschlag überhaupt entstehen durfte.
 *
 * DER SATZ IST ÄNDERBAR, BEVOR ER GILT. Wer ihn umschreibt, bekommt seine
 * eigene Formulierung - und daneben steht später "von dir umformuliert". Ohne
 * diese Möglichkeit bliebe nur annehmen oder verwerfen, und dann stünde am
 * Ende die Sprache des Modells da, wo die eigene hingehört.
 *
 * ABLEHNEN IST EIN ERSTER-KLASSE-KNOPF, kein kleines x: Ein Vorschlag über
 * einen Menschen darf nicht schwerer wegzubekommen sein als anzunehmen.
 */
export async function DirectionProposals({
  proposals,
}: {
  proposals: DirectionProposalRow[];
}) {
  if (proposals.length === 0) return null;
  const t = await getTranslations("direction.proposals");
  const tFacets = await getTranslations("direction.statements.facets");

  return (
    <section className="mt-8 rounded-3xl border border-violet-200 bg-violet-50/40 p-6">
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">{t("text")}</p>

      <ul className="mt-5 space-y-4">
        {proposals.map((proposal) => (
          <li key={proposal.id} className="rounded-2xl border border-violet-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-800">
              {tFacets(proposal.facet)}
            </p>

            {/* Der Beleg zuerst: erst das, was dasteht, dann die Deutung. */}
            <blockquote className="mt-3 border-l-2 border-violet-300 pl-3 text-sm italic leading-6 text-slate-600">
              „{proposal.quote}“
            </blockquote>

            <form action={confirmDirectionProposalAction} className="mt-4">
              <input type="hidden" name="proposalId" value={proposal.id} />
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                  {t("statementLabel")}
                </span>
                <input
                  type="text"
                  name="statement"
                  defaultValue={proposal.statement}
                  minLength={STATEMENT_MIN_LENGTH}
                  maxLength={STATEMENT_MAX_LENGTH}
                  required
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-slate-500">{t("editHint")}</p>
              <SubmitButton
                label={t("confirm")}
                pendingLabel={t("confirmPending")}
                className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white"
              />
            </form>

            <form action={rejectDirectionProposalAction} className="mt-3">
              <input type="hidden" name="proposalId" value={proposal.id} />
              <SubmitButton
                label={t("reject")}
                pendingLabel={t("rejectPending")}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              />
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
