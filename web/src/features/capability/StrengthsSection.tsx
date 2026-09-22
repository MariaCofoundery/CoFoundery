import { getTranslations } from "next-intl/server";
import {
  addStrengthAction,
  assessStrengthAction,
  confirmStrengthProposalAction,
  rejectStrengthProposalAction,
  removeStrengthAction,
} from "@/features/capability/strengthActions";
import {
  REFLECTED_GROUPS,
  STRENGTH_FREQUENCIES,
  strengthGap,
  type PersonStrength,
  type StrengthProposal,
} from "@/features/capability/strengthData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * "Deine Arbeitsweise" - Stärken mit zwei Blickrichtungen.
 *
 * ZWEI FRAGEN JE SATZ, und die zweite ist die wichtigere:
 *
 *   "Wie oft zeigt sich das bei dir?"
 *   "Was würden Menschen sagen, die dich erlebt haben?"
 *
 * DER PERSPEKTIVWECHSEL IST KEINE DEKO. Eine Selbsteinschätzung misst
 * Selbstbild und Selbstvertrauen, und beides ist ungleich verteilt: Wer
 * gelernt hat, sich zurückzunehmen, antwortet systematisch niedriger. Die
 * Frage nach der Außensicht verlangt nicht, sich selbst zu loben - man
 * berichtet nur, und das fällt vielen leichter.
 *
 * HÄUFIGKEIT, NICHT AUSPRÄGUNG. "Wie stark ist deine Ausdauer" ist eine
 * Eigenschaftsfrage. "Wie oft zeigt sich das" fragt nach etwas, das man
 * beobachten kann - dieselbe Entscheidung wie beim Fragenkatalog.
 *
 * UND KEINE ZAHL. Vier benannte Häufigkeiten, nichts wird verrechnet. Wo sich
 * die Blicke unterscheiden, steht ein Hinweis - keine Deutung: "hier siehst du
 * dich anders, als du andere vermutest", nicht "du unterschätzt dich". Die
 * Gründe dafür kennt diese Software nicht.
 */
export async function StrengthsSection({
  strengths,
  proposals,
}: {
  strengths: PersonStrength[];
  proposals: StrengthProposal[];
}) {
  const t = await getTranslations("capability.strengths");

  return (
    <section id="strengths" className="mt-8 scroll-mt-24">
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>

      {/* Vorschläge zuerst: Sie kommen aus einer Geschichte, die schon erzählt
          ist - das ist weniger Arbeit als ein leeres Feld. */}
      {proposals.length > 0 ? (
        <div className="mt-5 rounded-3xl border border-violet-200 bg-violet-50/40 p-5">
          <h3 className="text-sm font-semibold text-slate-900">{t("proposalsTitle")}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("proposalsText")}</p>
          <ul className="mt-4 space-y-4">
            {proposals.map((proposal) => (
              <li key={proposal.id} className="rounded-2xl border border-violet-200 bg-white p-4">
                <blockquote className="border-l-2 border-violet-300 pl-3 text-sm italic leading-6 text-slate-600">
                  „{proposal.quote}“
                </blockquote>
                <form action={confirmStrengthProposalAction} className="mt-3">
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <input
                    type="text"
                    name="statement"
                    defaultValue={proposal.statement}
                    minLength={3}
                    maxLength={200}
                    required
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  />
                  <SubmitButton
                    label={t("confirm")}
                    pendingLabel={t("pending")}
                    className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white"
                  />
                </form>
                <form action={rejectStrengthProposalAction} className="mt-2">
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <SubmitButton
                    label={t("reject")}
                    pendingLabel={t("pending")}
                    className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                  />
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {strengths.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-600">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {strengths.map((strength) => {
            const gap = strengthGap(strength);
            return (
              <li key={strength.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-950">{strength.statement}</p>

                <form action={assessStrengthAction} className="mt-4 grid gap-4 sm:grid-cols-3">
                  <input type="hidden" name="strengthId" value={strength.id} />
                  <label className="block">
                    <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                      {t("selfLabel")}
                    </span>
                    <select
                      name="selfFrequency"
                      defaultValue={strength.selfFrequency ?? ""}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                    >
                      <option value="">{t("unanswered")}</option>
                      {STRENGTH_FREQUENCIES.map((value) => (
                        <option key={value} value={value}>
                          {t(`frequencies.${value}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                      {t("reflectedLabel")}
                    </span>
                    <select
                      name="reflectedFrequency"
                      defaultValue={strength.reflectedFrequency ?? ""}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                    >
                      <option value="">{t("unanswered")}</option>
                      {STRENGTH_FREQUENCIES.map((value) => (
                        <option key={value} value={value}>
                          {t(`frequencies.${value}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                      {t("whoLabel")}
                    </span>
                    <select
                      name="reflectedWho"
                      defaultValue={strength.reflectedWho ?? ""}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                    >
                      <option value="">{t("unanswered")}</option>
                      {REFLECTED_GROUPS.map((value) => (
                        <option key={value} value={value}>
                          {t(`groups.${value}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="sm:col-span-3">
                    <SubmitButton
                      label={t("save")}
                      pendingLabel={t("pending")}
                      className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                    />
                  </div>
                </form>

                {gap ? (
                  /* EIN HINWEIS, KEINE DEUTUNG. Der Unterschied kann viele
                     Gründe haben, und die kennt diese Software nicht. */
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
                    {t(`gap.${gap}`)}
                  </p>
                ) : null}

                <form action={removeStrengthAction} className="mt-3">
                  <input type="hidden" name="strengthId" value={strength.id} />
                  <SubmitButton
                    label={t("remove")}
                    pendingLabel={t("pending")}
                    className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                  />
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <form action={addStrengthAction} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">{t("addTitle")}</h3>
        <label className="mt-3 block">
          <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
            {t("addLabel")}
          </span>
          <input
            type="text"
            name="statement"
            required
            minLength={3}
            maxLength={200}
            placeholder={t("addPlaceholder")}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
          />
        </label>
        <p className="mt-2 text-xs leading-5 text-slate-500">{t("addHint")}</p>
        <SubmitButton
          label={t("add")}
          pendingLabel={t("pending")}
          className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white"
        />
      </form>
    </section>
  );
}
