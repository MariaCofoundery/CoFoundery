import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { hasActiveConnectProfile } from "@/features/connect/connectData";
import { ConnectProblemForm } from "@/features/connect/ConnectProblemForm";
import { ProblemNight } from "@/features/connect/ProblemNight";
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
    <ProblemNight>
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-8">
      <Link
        href={`/connect/problems/${problemId}`}
        className="problem-back"
      >
        ← {t("problems.backToProblem")}
      </Link>
      <header className="problem-hero">
        <h1 className="problem-hero__title problem-hero__title--small">{t("problems.editTitle")}</h1>
        <p className="problem-hero__lead">{t("problems.editText")}</p>
      </header>

      {errorKey ? (
        <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      <ConnectProblemForm action={updateConnectProblemAction} problem={problem} canPublish={canPublish} t={t} />
    </main>
    </ProblemNight>
  );
}
