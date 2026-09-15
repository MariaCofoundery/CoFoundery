import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { hasActiveConnectProfile } from "@/features/connect/connectData";
import { ConnectProblemForm } from "@/features/connect/ConnectProblemForm";
import { updateConnectProblemAction } from "@/features/connect/connectProblemActions";
import { getConnectProblem } from "@/features/connect/connectProblemData";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import { knownKey } from "@/i18n/knownKey";

/**
 * Ein Problem aendern.
 *
 * Es gab das nicht: Wer einen Tippfehler im Titel hatte, konnte nur
 * zurueckziehen und neu schreiben - und verlor dabei alle, die schon Interesse
 * bekundet hatten. Anzeigen liessen sich die ganze Zeit bearbeiten.
 */
export default async function EditConnectProblemPage({
  params,
  searchParams,
}: {
  params: Promise<{ problemId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { problemId } = await params;
  const [t, query] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client, user } = await requireConnectMember(`/connect/problems/${problemId}/edit`);

  const problem = await getConnectProblem(client, problemId);
  if (!problem) notFound();
  // Fremde Eintraege fuehren zur Ansicht, nicht in ein Formular, das beim
  // Speichern scheitern wuerde.
  if (problem.author_user_id !== user.id) redirect(`/connect/problems/${problemId}`);

  const canPublish = await hasActiveConnectProfile(client, user.id);
  const errorKey = knownKey(query.error, CONNECT_ERROR_KEYS);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href={`/connect/problems/${problemId}`}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600"
      >
        ← {t("problems.backToProblem")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("problems.editTitle")}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("problems.editText")}</p>

      {errorKey ? (
        <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      <ConnectProblemForm action={updateConnectProblemAction} problem={problem} canPublish={canPublish} t={t} />
    </main>
  );
}
