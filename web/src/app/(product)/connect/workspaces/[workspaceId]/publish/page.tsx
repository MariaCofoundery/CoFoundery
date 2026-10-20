import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { readWorkspace } from "@/features/connect/workspaces/data";
import { PublicationForm } from "@/features/connect/workspaces/PublicationForm";
import type { PublicationPreview } from "@/features/connect/workspaces/developmentModel";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId } = await params;
  const { client, workspace: w } = await readWorkspace(workspaceId);
  if (w.role !== "owner" || w.status !== "active") notFound();
  const { data, error } = await client.rpc(
    "get_problem_workspace_publication_preview",
    { p_workspace: workspaceId },
  );
  const t = await getTranslations("problemWorkspace.development");
  return (
    <>
      <Link
        href={`/connect/workspaces/${workspaceId}`}
        className="min-h-11 py-3 underline"
      >
        {t("backWorkspace")}
      </Link>
      <header className="brand-panel rounded-[28px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{t("publication")}</h1>
        <p className="mt-3 text-white">{t("publishHelp")}</p>
      </header>
      {error || !data ? (
        <p role="alert">{t("publicationUnavailable")}</p>
      ) : (
        <>
          {(await searchParams).error && (
            <p role="alert">{t("publicationError")}</p>
          )}
          {!(data as PublicationPreview).can_publish && (
            <p>
              {t("profileRequired")}{" "}
              <Link href="/connect/profile" className="underline">
                {t("profileLink")}
              </Link>
            </p>
          )}
          <PublicationForm
            workspaceId={workspaceId}
            initial={data as PublicationPreview}
          />
        </>
      )}
    </>
  );
}
