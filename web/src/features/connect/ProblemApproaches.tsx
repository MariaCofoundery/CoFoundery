import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ConnectProfileRequired } from "@/features/connect/ConnectProfileRequired";
import {
  acceptConnectProblemInterestAction,
  expressConnectProblemInterestAction,
  saveConnectProblemApproachAction,
  withdrawConnectProblemApproachAction,
  withdrawConnectProblemInterestAction,
} from "@/features/connect/connectProblemActions";
import {
  PROBLEM_APPROACH_AUDIENCE_MAX,
  PROBLEM_APPROACH_AUDIENCE_MIN,
  PROBLEM_APPROACH_NEEDS_MAX,
  PROBLEM_APPROACH_NEEDS_MIN,
  PROBLEM_APPROACH_SUMMARY_MAX,
  PROBLEM_APPROACH_SUMMARY_MIN,
  PROBLEM_INTEREST_NOTE_MAX,
  PROBLEM_INTEREST_NOTE_MIN,
  type ConnectProblemApproach,
  type ConnectProblemInterest,
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
  ownReplies,
  receivedReplies,
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
  /** Die eigenen Meldungen zu fremden Ansaetzen, nach Ansatz. */
  ownReplies: Map<string, ConnectProblemInterest>;
  /** Die Meldungen zum eigenen Ansatz - die sieht sonst niemand. */
  receivedReplies: ConnectProblemInterest[];
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
            const author = approach.author_user_id ? authors.get(approach.author_user_id) : undefined;
            return (
              <li key={approach.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                  {t("problems.approachBy", {
                    name:
                      approach.author_user_id === null
                        ? t("problems.formerMember")
                        : author?.display_name ?? t("problems.unknownAuthor"),
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
                {author?.visibility === "public" && author.status === "active" ? (
                  <Link
                    href={`/connect/p/${author.public_slug}`}
                    className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline"
                  >
                    {t("problems.approachContact")}
                  </Link>
                ) : null}

                {/* Der Weg zu dieser Person. Er laeuft ueber dieselbe Meldung
                    wie beim Problem - nur an einen anderen Empfaenger. */}
                {canWrite ? (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    {ownReplies.get(approach.id) ? (
                      <>
                        <p className="text-sm font-semibold">
                          {t("problems.yourApproachReplyTitle")}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {ownReplies.get(approach.id)?.note}
                        </p>
                        <form action={withdrawConnectProblemInterestAction} className="mt-3">
                          <input type="hidden" name="problem_id" value={problemId} />
                          <input type="hidden" name="approach_id" value={approach.id} />
                          <ConfirmSubmitButton
                            label={t("problems.withdrawApproachReply")}
                            question={t("problems.withdrawInterestQuestion")}
                            confirmLabel={t("problems.withdrawInterestConfirm")}
                            cancelLabel={t("problems.withdrawInterestCancel")}
                            pendingLabel={t("pending.save")}
                            className="text-sm font-semibold text-slate-500 underline underline-offset-2"
                            confirmClassName={`${secondaryClassName} border-rose-200 bg-rose-50 text-rose-900`}
                          />
                        </form>
                      </>
                    ) : !hasProfile ? (
                      <ConnectProfileRequired
                        returnTo={`/connect/problems/${problemId}`}
                        copy={{
                          title: t("problems.approachReplyProfileRequiredTitle"),
                          text: t("problems.approachReplyProfileRequiredText"),
                          cta: t("contact.profileRequiredCta"),
                        }}
                      />
                    ) : (
                      <details>
                        <summary className="cursor-pointer text-sm font-semibold text-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">
                          {t("problems.approachReplyTitle")}
                        </summary>
                        <form action={expressConnectProblemInterestAction} className="mt-3">
                          <input type="hidden" name="problem_id" value={problemId} />
                          <input type="hidden" name="approach_id" value={approach.id} />
                          <p className="text-sm leading-6 text-slate-600">
                            {t("problems.approachReplyText")}
                          </p>
                          <textarea
                            name="note"
                            required
                            rows={3}
                            minLength={PROBLEM_INTEREST_NOTE_MIN}
                            maxLength={PROBLEM_INTEREST_NOTE_MAX}
                            className={fieldClassName}
                            placeholder={t("problems.approachReplyPlaceholder")}
                          />
                          <span className={hintClassName}>
                            {t("problems.interestNoteHint", { min: PROBLEM_INTEREST_NOTE_MIN })}
                          </span>
                          <SubmitButton
                            label={t("problems.approachReply")}
                            pendingLabel={t("pending.save")}
                            className={`${secondaryClassName} mt-3`}
                          />
                        </form>
                      </details>
                    )}
                  </div>
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

                <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    name="outlives_account"
                    value="yes"
                    defaultChecked={ownApproach?.outlives_account ?? false}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      {t("problems.outlivesApproachLabel")}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {t("problems.outlivesApproachHint")}
                    </span>
                  </span>
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

              {/* Die Meldungen zum eigenen Ansatz - dieselbe Zurueckhaltung
                  wie beim Problem: Die Namen sieht nur, wem sie gelten. */}
              {ownApproach?.status === "active" ? (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h4 className="text-sm font-semibold">{t("problems.approachRepliesTitle")}</h4>
                  {receivedReplies.length ? (
                    <ul className="mt-3 space-y-4">
                      {receivedReplies.map((reply) => (
                        <li key={reply.id} className="rounded-2xl bg-slate-50 p-4">
                          <p className="font-medium">
                            {authors.get(reply.user_id)?.display_name ??
                              t("problems.unknownAuthor")}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {reply.note}
                          </p>
                          <form action={acceptConnectProblemInterestAction} className="mt-3">
                            <input type="hidden" name="interest_id" value={reply.id} />
                            <input type="hidden" name="problem_id" value={problemId} />
                            <SubmitButton
                              label={t("problems.startConversation")}
                              pendingLabel={t("pending.save")}
                              className={primaryClassName}
                            />
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      {t("problems.approachRepliesEmpty")}
                    </p>
                  )}
                </div>
              ) : null}

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
