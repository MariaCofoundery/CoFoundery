import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { hasActiveConnectProfile } from "@/features/connect/connectData";
import { ConnectProfileRequired } from "@/features/connect/ConnectProfileRequired";
import { saveConnectProblemAction } from "@/features/connect/connectProblemActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import {
  CONNECT_GEOGRAPHIC_SCOPES,
  CONNECT_PROBLEM_INTENTS,
  PROBLEM_DESCRIPTION_MAX,
  PROBLEM_DESCRIPTION_MIN,
  PROBLEM_TITLE_MAX,
  PROBLEM_TITLE_MIN,
} from "@/features/connect/connectTypes";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import { DictatedTextarea } from "@/features/dictation/DictatedTextarea";
import { knownKey } from "@/i18n/knownKey";

const field =
  "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const hint = "mt-1 block text-xs leading-5 text-slate-500";

export default async function NewConnectProblemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client, user } = await requireConnectMember("/connect/problems/new");
  // Wie ueberall in Connect: die Voraussetzung steht vor der Arbeit, nicht
  // hinter dem Absenden.
  const canPublish = await hasActiveConnectProfile(client, user.id);
  const errorKey = knownKey(params.error, CONNECT_ERROR_KEYS);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/connect/problems" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">
        ← {t("problems.backToBoard")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("problems.createTitle")}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("problems.createText")}</p>

      {errorKey ? (
        <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      {!canPublish ? (
        <ConnectProfileRequired
          returnTo="/connect/problems/new"
          copy={{
            title: t("problems.profileRequiredTitle"),
            text: t("problems.profileRequiredText"),
            cta: t("contact.profileRequiredCta"),
          }}
        />
      ) : null}

      <form action={saveConnectProblemAction} className="mt-6 space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium">
          {t("problems.form.title")}
          <input
            name="title"
            required
            minLength={PROBLEM_TITLE_MIN}
            maxLength={PROBLEM_TITLE_MAX}
            className={field}
            placeholder={t("problems.form.titlePlaceholder")}
          />
          <span className={hint}>{t("problems.form.titleHint")}</span>
        </label>

        {/* Diktierbar wie die Erzaehlung im Profil: Wer ein Problem schildert,
            erzaehlt es meist leichter, als er es tippt. */}
        <label className="block text-sm font-medium" htmlFor="problem-description">
          {t("problems.form.description")}
          <DictatedTextarea
            id="problem-description"
            name="description"
            required
            rows={7}
            minLength={PROBLEM_DESCRIPTION_MIN}
            maxLength={PROBLEM_DESCRIPTION_MAX}
            placeholder={t("problems.form.descriptionPlaceholder")}
            className={field}
          />
          <span className={hint}>{t("problems.form.descriptionHint", { min: PROBLEM_DESCRIPTION_MIN })}</span>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">{t("problems.form.intent")}</legend>
          <p className={hint}>{t("problems.form.intentHint")}</p>
          <div className="mt-3 grid gap-2">
            {CONNECT_PROBLEM_INTENTS.map((value) => (
              <label key={value} className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <input type="radio" name="author_intent" value={value} required className="mt-1" />
                <span>
                  <span className="font-medium">{t(`problems.intents.${value}`)}</span>
                  <span className={hint}>{t(`problems.intentHints.${value}`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium">
            {t("problems.form.locations")}
            <input name="locations" className={field} placeholder={t("problems.form.locationsPlaceholder")} />
            <span className={hint}>{t("problems.form.locationsHint", { max: 3 })}</span>
          </label>
          <label className="text-sm font-medium">
            {t("filters.scope")}
            <select name="geographic_scope" defaultValue="regional" className={field}>
              {CONNECT_GEOGRAPHIC_SCOPES.map((value) => (
                <option key={value} value={value}>
                  {t(`scopes.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            {t("form.topics")}
            <input name="topics" className={field} />
            <span className={hint}>{t("form.topicsHint", { max: 8 })}</span>
          </label>
          <label className="text-sm font-medium">
            {t("form.industries")}
            <input name="industries" className={field} />
            <span className={hint}>{t("form.industriesHint", { max: 5 })}</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          {canPublish ? (
            <SubmitButton
              intent="publish"
              label={t("problems.form.publish")}
              pendingLabel={t("pending.publish")}
              className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold"
            />
          ) : null}
          <SubmitButton
            intent="draft"
            label={t("problems.form.saveDraft")}
            pendingLabel={t("pending.save")}
            className="min-h-11 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold"
          />
        </div>
      </form>
    </main>
  );
}
