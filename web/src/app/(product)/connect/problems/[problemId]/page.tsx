import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getConnectProfilesByUserIds, hasActiveConnectProfile } from "@/features/connect/connectData";
import { ConnectProfileRequired } from "@/features/connect/ConnectProfileRequired";
import {
  acceptConnectProblemInterestAction,
  expressConnectProblemInterestAction,
  updateConnectProblemStatusAction,
  withdrawConnectProblemInterestAction,
} from "@/features/connect/connectProblemActions";
import {
  getConnectProblem,
  getConnectProblemApproaches,
  getConnectProblemConfirmations,
  getConnectProblemInterests,
  getOwnConnectProblemConfirmation,
  getOwnConnectProblemInterest,
} from "@/features/connect/connectProblemData";
import { ProblemApproaches } from "@/features/connect/ProblemApproaches";
import { ProblemConfirmations } from "@/features/connect/ProblemConfirmations";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import {
  PROBLEM_INTEREST_NOTE_MAX,
  PROBLEM_INTEREST_NOTE_MIN,
} from "@/features/connect/connectTypes";
import { ConfirmSubmitButton } from "@/features/ui/ConfirmSubmitButton";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { knownKey } from "@/i18n/knownKey";

const card = "rounded-3xl border border-slate-200 bg-white p-6";
const field =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const hint = "mt-1 block text-xs leading-5 text-slate-500";
const primary = "min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold";
const secondary = "min-h-11 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold";

const SAVED_KEYS = ["interest", "approach"];

export default async function ConnectProblemPage({
  params,
  searchParams,
}: {
  params: Promise<{ problemId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { problemId } = await params;
  const [t, query] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client, user } = await requireConnectMember(`/connect/problems/${problemId}`);

  const problem = await getConnectProblem(client, problemId);
  // Entwuerfe anderer Menschen liefert die Datenbank gar nicht erst aus.
  if (!problem) notFound();

  const isAuthor = problem.author_user_id === user.id;
  const isPublished = problem.status === "active";
  const [authors, ownInterest, interests, hasProfile, confirmations, ownConfirmation, approaches] =
    await Promise.all([
      getConnectProfilesByUserIds(client, [problem.author_user_id]),
      isAuthor ? Promise.resolve(null) : getOwnConnectProblemInterest(client, problemId, user.id),
      isAuthor ? getConnectProblemInterests(client, problemId) : Promise.resolve([]),
      isAuthor ? Promise.resolve(true) : hasActiveConnectProfile(client, user.id),
      getConnectProblemConfirmations(client, problemId),
      isAuthor
        ? Promise.resolve(null)
        : getOwnConnectProblemConfirmation(client, problemId, user.id),
      getConnectProblemApproaches(client, problemId),
    ]);

  // Der eigene Ansatz steht in seinem eigenen Block - im Formular, nicht in
  // der Liste, sonst stuende derselbe Text zweimal auf der Seite.
  const ownApproach = approaches.find((approach) => approach.author_user_id === user.id) ?? null;
  const otherApproaches = approaches.filter((approach) => approach.author_user_id !== user.id);

  const [interestedProfiles, approachProfiles] = await Promise.all([
    getConnectProfilesByUserIds(
      client,
      interests.map((interest) => interest.user_id)
    ),
    getConnectProfilesByUserIds(
      client,
      otherApproaches.map((approach) => approach.author_user_id)
    ),
  ]);

  const author = authors.get(problem.author_user_id);
  const errorKey = knownKey(query.error, CONNECT_ERROR_KEYS);
  const saved = SAVED_KEYS.includes(query.saved ?? "") ? query.saved : null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/connect/problems" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">
        ← {t("problems.backToBoard")}
      </Link>

      {saved ? (
        <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          {t(query.saved === "approach" ? "problems.approachSaved" : "problems.interestSaved")}
        </p>
      ) : null}
      {errorKey ? (
        <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      <article className={`${card} mt-5`}>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-700">
          {t(`problems.intents.${problem.author_intent}`)} · {t(`scopes.${problem.geographic_scope}`)}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{problem.title}</h1>
        {problem.status !== "active" ? (
          <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
            {t(`problems.statuses.${problem.status}`)}
          </p>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{problem.description}</p>

        {problem.locations.length || problem.topics.length || problem.industries.length ? (
          <p className="mt-4 text-sm text-slate-500">
            {[...problem.locations, ...problem.topics, ...problem.industries].join(" · ")}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
          <span>{author?.display_name ?? t("problems.unknownAuthor")}</span>
          <span>{t("problems.interestCount", { count: problem.interest_count })}</span>
        </div>
      </article>

      <ProblemConfirmations
        problemId={problem.id}
        counts={confirmations}
        ownConfirmation={ownConfirmation}
        canConfirm={!isAuthor && isPublished}
        className={`${card} mt-6`}
      />

      <ProblemApproaches
        problemId={problem.id}
        approaches={otherApproaches}
        authors={approachProfiles}
        ownApproach={ownApproach}
        canWrite={isPublished}
        hasProfile={isAuthor ? true : hasProfile}
        className={`${card} mt-6`}
        fieldClassName={field}
        hintClassName={hint}
        primaryClassName={primary}
        secondaryClassName={secondary}
      />

      {/* Die eigene Sicht: zurueckziehen oder als geloest markieren. */}
      {isAuthor ? (
        <section className={`${card} mt-6`}>
          <h2 className="text-lg font-semibold">{t("problems.ownTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("problems.ownText")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {problem.status === "draft" ? (
              <form action={updateConnectProblemStatusAction}>
                <input type="hidden" name="problem_id" value={problem.id} />
                <input type="hidden" name="status" value="active" />
                <SubmitButton label={t("problems.publish")} pendingLabel={t("pending.publish")} className={primary} />
              </form>
            ) : null}
            {problem.status === "active" ? (
              <>
                <form action={updateConnectProblemStatusAction}>
                  <input type="hidden" name="problem_id" value={problem.id} />
                  <input type="hidden" name="status" value="resolved" />
                  <SubmitButton label={t("problems.markResolved")} pendingLabel={t("pending.save")} className={secondary} />
                </form>
                <form action={updateConnectProblemStatusAction}>
                  <input type="hidden" name="problem_id" value={problem.id} />
                  <input type="hidden" name="status" value="withdrawn" />
                  <SubmitButton label={t("problems.withdraw")} pendingLabel={t("pending.save")} className={secondary} />
                </form>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Die Namen sieht nur die einstellende Person - die Datenbank gibt sie
          niemandem sonst. */}
      {isAuthor ? (
        <section className={`${card} mt-6`}>
          <h2 className="text-lg font-semibold">{t("problems.interestedTitle")}</h2>
          {interests.length ? (
            <ul className="mt-4 space-y-4">
              {interests.map((interest) => (
                <li key={interest.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium">
                    {interestedProfiles.get(interest.user_id)?.display_name ?? t("problems.unknownAuthor")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{interest.note}</p>
                  <form action={acceptConnectProblemInterestAction} className="mt-3">
                    <input type="hidden" name="interest_id" value={interest.id} />
                    <input type="hidden" name="problem_id" value={problem.id} />
                    <SubmitButton
                      label={t("problems.startConversation")}
                      pendingLabel={t("pending.save")}
                      className={primary}
                    />
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">{t("problems.interestedEmpty")}</p>
          )}
        </section>
      ) : null}

      {/* Die fremde Sicht: Interesse zeigen oder zurueckziehen. */}
      {!isAuthor && isPublished ? (
        <section className={`${card} mt-6`}>
          {ownInterest ? (
            <>
              <h2 className="text-lg font-semibold">{t("problems.yourInterestTitle")}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ownInterest.note}</p>
              <p className={hint}>{t("problems.yourInterestText")}</p>
              <form action={withdrawConnectProblemInterestAction} className="mt-4">
                <input type="hidden" name="problem_id" value={problem.id} />
                {/* Mit dem Interesse faellt ein daraus entstandenes Gespraech
                    weg - deshalb eine Rueckfrage, die das auch sagt. */}
                <ConfirmSubmitButton
                  label={t("problems.withdrawInterest")}
                  question={t("problems.withdrawInterestQuestion")}
                  confirmLabel={t("problems.withdrawInterestConfirm")}
                  cancelLabel={t("problems.withdrawInterestCancel")}
                  pendingLabel={t("pending.save")}
                  className="text-sm font-semibold text-slate-500 underline underline-offset-2"
                  confirmClassName="min-h-11 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-900"
                />
              </form>
            </>
          ) : !hasProfile ? (
            <ConnectProfileRequired
              returnTo={`/connect/problems/${problem.id}`}
              copy={{
                title: t("problems.interestProfileRequiredTitle"),
                text: t("problems.interestProfileRequiredText"),
                cta: t("contact.profileRequiredCta"),
              }}
            />
          ) : (
            <form action={expressConnectProblemInterestAction}>
              <input type="hidden" name="problem_id" value={problem.id} />
              <h2 className="text-lg font-semibold">{t("problems.interestTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("problems.interestText")}</p>
              <label className="mt-4 block text-sm font-medium">
                {t("problems.interestNoteLabel")}
                <textarea
                  name="note"
                  required
                  rows={4}
                  minLength={PROBLEM_INTEREST_NOTE_MIN}
                  maxLength={PROBLEM_INTEREST_NOTE_MAX}
                  className={field}
                  placeholder={t("problems.interestNotePlaceholder")}
                />
                <span className={hint}>{t("problems.interestNoteHint", { min: PROBLEM_INTEREST_NOTE_MIN })}</span>
              </label>
              <SubmitButton
                label={t("problems.expressInterest")}
                pendingLabel={t("pending.save")}
                className={`${primary} mt-4`}
              />
            </form>
          )}
        </section>
      ) : null}
    </main>
  );
}
