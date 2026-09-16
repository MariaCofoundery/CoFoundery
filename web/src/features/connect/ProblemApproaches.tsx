import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ConnectProfileRequired } from "@/features/connect/ConnectProfileRequired";
import {
  saveConnectProblemApproachAction,
  withdrawConnectProblemApproachAction,
} from "@/features/connect/connectProblemActions";
import {
  PROBLEM_APPROACH_AUDIENCE_MAX,
  PROBLEM_APPROACH_AUDIENCE_MIN,
  PROBLEM_APPROACH_NEEDS_MAX,
  PROBLEM_APPROACH_NEEDS_MIN,
  PROBLEM_APPROACH_SUMMARY_MAX,
  PROBLEM_APPROACH_SUMMARY_MIN,
  type ConnectProblemApproach,
  type ConnectProfile,
} from "@/features/connect/connectTypes";
import { ConfirmSubmitButton } from "@/features/ui/ConfirmSubmitButton";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Der Schritt vom Problem zum Ansatz.
 *
 * Bisher passierte er unsichtbar in einem Gespraech - und damit auch der
 * Moment, in dem zwei Menschen merken, dass sie Verschiedenes bauen wuerden.
 * Hier steht er vorher da.
 *
 * Keine Rangfolge, keine Bewertung, keine Abstimmung darueber, welcher Ansatz
 * der beste ist. Sie stehen nach Alter nebeneinander, damit man sieht, dass
 * sie auseinandergehen - nicht, damit einer gewinnt.
 */
export async function ProblemApproaches({
  problemId,
  approaches,
  authors,
  ownApproach,
  canWrite,
  hasProfile,
  className,
  fieldClassName,
  hintClassName,
  primaryClassName,
  secondaryClassName,
}: {
  problemId: string;
  /** Ohne den eigenen - der steht in seinem eigenen Block. */
  approaches: ConnectProblemApproach[];
  authors: Map<string, ConnectProfile>;
  ownApproach: ConnectProblemApproach | null;
  /** Falsch, solange das Problem nicht veroeffentlicht ist. */
  canWrite: boolean;
  hasProfile: boolean;
  className: string;
  fieldClassName: string;
  hintClassName: string;
  primaryClassName: string;
  secondaryClassName: string;
}) {
  const t = await getTranslations("connect");

  return (
    <section className={className}>
      <h2 className="text-lg font-semibold">{t("problems.approachesTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("problems.approachesText")}</p>

      {approaches.length ? (
        <ul className="mt-5 space-y-4">
          {approaches.map((approach) => {
            const author = authors.get(approach.author_user_id);
            return (
              <li key={approach.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                  {t("problems.approachBy", {
                    name: author?.display_name ?? t("problems.unknownAuthor"),
                  })}
                </p>
                {author?.headline ? (
                  <p className="mt-1 text-sm text-slate-600">{author.headline}</p>
                ) : null}
                <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-800">
                  {approach.summary}
                </p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                      {t("problems.approachAudienceLabel")}
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-700">{approach.audience}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                      {t("problems.approachNeedsLabel")}
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-700">{approach.needs}</dd>
                  </div>
                </dl>
                {/* Kein eigener Gespraechsweg an dieser Stelle - es gibt in
                    Connect keine interne Profilseite, Kontakt laeuft ueber
                    Anzeigen. Verlinkt wird deshalb nur die oeffentliche Seite,
                    und nur wenn diese Person sie freigegeben hat. */}
                {author?.visibility === "public" && author.status === "active" ? (
                  <Link
                    href={`/connect/p/${author.public_slug}`}
                    className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline"
                  >
                    {t("problems.approachContact")}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : ownApproach ? null : (
        <p className="mt-4 text-sm leading-6 text-slate-600">{t("problems.approachesEmpty")}</p>
      )}

      {canWrite ? (
        <div className="mt-6 border-t border-slate-100 pt-6">
          {!hasProfile ? (
            <ConnectProfileRequired
              returnTo={`/connect/problems/${problemId}`}
              copy={{
                title: t("problems.approachProfileRequiredTitle"),
                text: t("problems.approachProfileRequiredText"),
                cta: t("contact.profileRequiredCta"),
              }}
            />
          ) : (
            <>
              {ownApproach?.status === "withdrawn" ? (
                <p className="mb-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  {t("problems.yourApproachWithdrawn")}
                </p>
              ) : null}

              <form action={saveConnectProblemApproachAction}>
                <input type="hidden" name="problem_id" value={problemId} />
                <h3 className="text-sm font-semibold">
                  {t(ownApproach ? "problems.yourApproachTitle" : "problems.approachFormTitle")}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {t("problems.approachFormText")}
                </p>

                <label className="mt-4 block text-sm font-medium">
                  {t("problems.approachSummary")}
                  <textarea
                    name="summary"
                    required
                    rows={4}
                    minLength={PROBLEM_APPROACH_SUMMARY_MIN}
                    maxLength={PROBLEM_APPROACH_SUMMARY_MAX}
                    defaultValue={ownApproach?.summary ?? ""}
                    className={fieldClassName}
                    placeholder={t("problems.approachSummaryPlaceholder")}
                  />
                  <span className={hintClassName}>
                    {t("problems.approachSummaryHint", { min: PROBLEM_APPROACH_SUMMARY_MIN })}
                  </span>
                </label>

                <label className="mt-4 block text-sm font-medium">
                  {t("problems.approachAudience")}
                  <input
                    name="audience"
                    required
                    minLength={PROBLEM_APPROACH_AUDIENCE_MIN}
                    maxLength={PROBLEM_APPROACH_AUDIENCE_MAX}
                    defaultValue={ownApproach?.audience ?? ""}
                    className={fieldClassName}
                    placeholder={t("problems.approachAudiencePlaceholder")}
                  />
                </label>

                <label className="mt-4 block text-sm font-medium">
                  {t("problems.approachNeeds")}
                  <textarea
                    name="needs"
                    required
                    rows={2}
                    minLength={PROBLEM_APPROACH_NEEDS_MIN}
                    maxLength={PROBLEM_APPROACH_NEEDS_MAX}
                    defaultValue={ownApproach?.needs ?? ""}
                    className={fieldClassName}
                    placeholder={t("problems.approachNeedsPlaceholder")}
                  />
                  <span className={hintClassName}>{t("problems.approachNeedsHint")}</span>
                </label>

                <SubmitButton
                  label={t(
                    ownApproach?.status === "active"
                      ? "problems.approachUpdate"
                      : "problems.approachSave"
                  )}
                  pendingLabel={t("pending.save")}
                  className={`${primaryClassName} mt-5`}
                />
              </form>

              {ownApproach?.status === "active" ? (
                <form action={withdrawConnectProblemApproachAction} className="mt-4">
                  <input type="hidden" name="problem_id" value={problemId} />
                  <ConfirmSubmitButton
                    label={t("problems.withdrawApproach")}
                    question={t("problems.withdrawApproachQuestion")}
                    confirmLabel={t("problems.withdrawApproachConfirm")}
                    cancelLabel={t("problems.withdrawApproachCancel")}
                    pendingLabel={t("pending.save")}
                    className="text-sm font-semibold text-slate-500 underline underline-offset-2"
                    confirmClassName={`${secondaryClassName} border-rose-200 bg-rose-50 text-rose-900`}
                  />
                </form>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
