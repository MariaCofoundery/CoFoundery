import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { hasActiveConnectProfile } from "@/features/connect/connectData";
import { ConnectProfileRequired } from "@/features/connect/ConnectProfileRequired";
import { ConnectProblemForm } from "@/features/connect/ConnectProblemForm";
import { ProblemLiveNote } from "@/features/connect/ProblemLiveNote";
import { CONNECT_PROBLEM_INTENTS } from "@/features/connect/connectTypes";
import { saveConnectProblemAction } from "@/features/connect/connectProblemActions";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import { knownKey } from "@/i18n/knownKey";

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
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/connect/problems" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">
        ← {t("problems.backToBoard")}
      </Link>
      <header className="brand-panel mt-3 rounded-[28px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{t("problems.createTitle")}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-white">{t("problems.createText")}</p>
      </header>

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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ConnectProblemForm action={saveConnectProblemAction} canPublish={canPublish} t={t} />
        <div className="lg:sticky lg:top-6 lg:mt-6">
          <ProblemLiveNote
            formId="problem-form"
            copy={{
              title: t("problems.live.title"),
              emptyTitle: t("problems.live.emptyTitle"),
              emptyDescription: t("problems.live.emptyDescription"),
              tried: t("problems.live.tried"),
              now: t("problems.live.now"),
              intents: Object.fromEntries(
                CONNECT_PROBLEM_INTENTS.map((value) => [value, t(`problems.intents.${value}`)])
              ),
            }}
          />
        </div>
      </div>
    </main>
  );
}
