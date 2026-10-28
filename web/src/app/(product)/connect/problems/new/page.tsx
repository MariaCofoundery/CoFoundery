import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { hasActiveConnectProfile } from "@/features/connect/connectData";
import { ConnectProfileRequired } from "@/features/connect/ConnectProfileRequired";
import { ConnectProblemForm } from "@/features/connect/ConnectProblemForm";
import { ProblemLiveNote } from "@/features/connect/ProblemLiveNote";
import { ProblemNight } from "@/features/connect/ProblemNight";
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
    <ProblemNight>
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-8">
      <Link href="/connect/problems" className="problem-back">
        ← {t("problems.backToBoard")}
      </Link>
      <header className="problem-hero">
        <h1 className="problem-hero__title problem-hero__title--small">{t("problems.createTitle")}</h1>
        <p className="problem-hero__lead">{t("problems.createText")}</p>
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
    </ProblemNight>
  );
}
