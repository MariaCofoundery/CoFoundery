import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  assessStrengthAction,
  removeStrengthAction,
} from "@/features/capability/strengthActions";
import { StrengthProposalCards } from "@/features/strengths/StrengthProposalCards";
import {
  REFLECTED_GROUPS,
  STRENGTH_FREQUENCIES,
  strengthGap,
  type PersonStrength,
  type StrengthProposal,
} from "@/features/capability/strengthData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { domainOfTheme, STRENGTH_DOMAINS, type StrengthDomain } from "@/features/strengths/strengthThemes";

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
  const tEnd = await getTranslations("strengths");
  const groups: { key: StrengthDomain | "other"; items: PersonStrength[] }[] = [
    ...STRENGTH_DOMAINS.map((domain) => ({ key: domain, items: strengths.filter((entry) => entry.theme && domainOfTheme(entry.theme) === domain) })),
    { key: "other" as const, items: strengths.filter((entry) => !entry.theme) },
  ].filter((group) => group.items.length > 0);

  return (
    <section id="strengths" className="mt-8 scroll-mt-24">
      <h2 className="font-brand text-[clamp(28px,3.4vw,40px)] font-normal leading-[1.1] tracking-[-0.01em]">{tEnd("end.title")}</h2>
      <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-slate-600">{tEnd("end.intro")}</p>

      {/* Vorschläge zuerst: Sie kommen aus einer Geschichte, die schon erzählt
          ist - das ist weniger Arbeit als ein leeres Feld. Dieselbe Karte wie
          am Ende des Stärken-Interviews. */}
      {proposals.length > 0 ? (
        <div className="mt-5 rounded-3xl border border-violet-200 bg-violet-50/40 p-5">
          <h3 className="text-sm font-semibold text-slate-900">{t("proposalsTitle")}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("proposalsText")}</p>
          <StrengthProposalCards proposals={proposals} />
        </div>
      ) : null}

      {strengths.length === 0 ? (
        <div className="mt-5 flex flex-col items-start gap-4 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6">
          <p className="max-w-xl text-[16px] leading-relaxed text-slate-700">{tEnd("end.empty")}</p>
          <Link href="/profile/strengths-interview?neu=1" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">
            {tEnd("end.emptyCta")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <h3 className="font-brand text-2xl font-normal text-slate-950">
                {group.key === "other" ? tEnd("end.other") : tEnd(`themes.domains.${group.key}.title`)}
              </h3>
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                {group.items.map((strength) => {
                  const gap = strengthGap(strength);
                  return (
                    <li key={strength.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-950">{strength.label ?? strength.statement}</p>
                        {strength.evidenceLevel ? (
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900">{tEnd(`proposals.level.${strength.evidenceLevel}`)}</span>
                        ) : null}
                      </div>
                      {strength.label ? <p className="text-[15px] leading-6 text-slate-700">{strength.statement}</p> : null}

                      <details className="group mt-1">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">{tEnd("end.assess")}</summary>
                        <form action={assessStrengthAction} className="mt-2 grid gap-3">
                          <input type="hidden" name="strengthId" value={strength.id} />
                          <label className="block">
                            <span className="block text-xs font-semibold text-slate-600">{t("selfLabel")}</span>
                            <select name="selfFrequency" defaultValue={strength.selfFrequency ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                              <option value="">{t("unanswered")}</option>
                              {STRENGTH_FREQUENCIES.map((value) => (
                                <option key={value} value={value}>{t(`frequencies.${value}`)}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="block text-xs font-semibold text-slate-600">{t("reflectedLabel")}</span>
                            <select name="reflectedFrequency" defaultValue={strength.reflectedFrequency ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                              <option value="">{t("unanswered")}</option>
                              {STRENGTH_FREQUENCIES.map((value) => (
                                <option key={value} value={value}>{t(`frequencies.${value}`)}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="block text-xs font-semibold text-slate-600">{t("whoLabel")}</span>
                            <select name="reflectedWho" defaultValue={strength.reflectedWho ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                              <option value="">{t("unanswered")}</option>
                              {REFLECTED_GROUPS.map((value) => (
                                <option key={value} value={value}>{t(`groups.${value}`)}</option>
                              ))}
                            </select>
                          </label>
                          <SubmitButton
                            label={t("save")}
                            pendingLabel={t("pending")}
                            className="inline-flex min-h-11 w-fit items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                          />
                        </form>
                      </details>

                      {gap ? (
                        /* EIN HINWEIS, KEINE DEUTUNG. Der Unterschied kann viele Gründe haben, und die kennt diese Software nicht. */
                        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">{t(`gap.${gap}`)}</p>
                      ) : null}

                      <form action={removeStrengthAction} className="mt-auto">
                        <input type="hidden" name="strengthId" value={strength.id} />
                        <SubmitButton
                          label={t("remove")}
                          pendingLabel={t("pending")}
                          className="inline-flex min-h-11 items-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                        />
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
