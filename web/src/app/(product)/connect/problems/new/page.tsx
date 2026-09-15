import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { hasActiveConnectProfile } from "@/features/connect/connectData";
import { ConnectProfileRequired } from "@/features/connect/ConnectProfileRequired";
import { ConnectProblemForm } from "@/features/connect/ConnectProblemForm";
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

      <ConnectProblemForm action={saveConnectProblemAction} canPublish={canPublish} t={t} />
    </main>
  );
}
