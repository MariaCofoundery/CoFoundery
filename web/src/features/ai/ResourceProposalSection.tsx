import { getTranslations } from "next-intl/server";
import {
  confirmResourceProposalAction,
  rejectResourceProposalAction,
} from "@/features/ai/resourceProposalActions";
import type { PersonResource } from "@/features/ai/personResources";

/**
 * Die Vorschlaege aus den eigenen veroeffentlichten Texten.
 *
 * JEDER VORSCHLAG ZEIGT SEINEN BELEG. Das ist nicht Schmuck, sondern die
 * einzige Grundlage, auf der jemand entscheiden kann: Ohne das Zitat muesste
 * man einer Maschine glauben oder ihr misstrauen - mit dem Zitat kann man
 * nachsehen.
 *
 * Die Reihenfolge der Knoepfe ist Absicht: Verwerfen steht nicht als
 * gleichrangige Handlung daneben, sondern als leiser Weg. Und "Bestätigen" ist
 * nicht vorausgewaehlt - es gibt kein Formular, das man versehentlich
 * abschickt.
 */
export async function ResourceProposalSection({ proposals }: { proposals: PersonResource[] }) {
  const pending = proposals.filter((proposal) => proposal.status === "pending");
  const confirmed = proposals.filter((proposal) => proposal.status === "confirmed");
  if (pending.length === 0 && confirmed.length === 0) return null;

  const t = await getTranslations("connect.resources");

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("text")}</p>

      {pending.length > 0 ? (
        <div className="mt-5 grid gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t("pendingTitle")}
          </h3>
          {pending.map((proposal) => (
            <article key={proposal.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
                {t(`kinds.${proposal.kind}`)}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{proposal.label}</p>

              {/* Der Beleg. Ohne ihn waere das hier eine Behauptung. */}
              {proposal.evidenceQuote ? (
                <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-sm leading-6 text-slate-600">
                  {t("quote", { quote: proposal.evidenceQuote })}
                </blockquote>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <form action={confirmResourceProposalAction.bind(null, proposal.id)}>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    {t("confirm")}
                  </button>
                </form>
                <form action={rejectResourceProposalAction.bind(null, proposal.id)}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
                  >
                    {t("reject")}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {confirmed.length > 0 ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t("confirmedTitle")}
          </h3>
          <ul className="mt-2 grid gap-1">
            {confirmed.map((proposal) => (
              <li key={proposal.id} className="text-sm leading-6 text-slate-800">
                <span className="text-slate-500">{t(`kinds.${proposal.kind}`)}</span> {proposal.label}
              </li>
            ))}
          </ul>
          {/* Sichtbar ist das bisher fuer niemanden sonst. Das zu verschweigen
              waere die unangenehmere Ueberraschung - in beide Richtungen. */}
          <p className="mt-3 text-xs leading-5 text-slate-500">{t("privateNote")}</p>
        </div>
      ) : null}
    </section>
  );
}
