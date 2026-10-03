import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { readWorkspace } from "@/features/connect/workspaces/data";
import { OpportunityForm } from "@/features/connect/workspaces/OpportunityForm";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspaceId } = await params;
  const { workspace: w } = await readWorkspace(workspaceId);
  if (w.role !== "owner" || w.status !== "active") notFound();
  const t = await getTranslations("problemWorkspace.development"),
    common = await getTranslations("problemWorkspace");
  return (
    <>
      <Link
        href={`/connect/workspaces/${w.id}`}
        className="min-h-11 py-3 underline"
      >
        {t("backWorkspace")}
      </Link>
      <h1 className="text-3xl font-semibold">{t("newOpportunity")}</h1>
      <p>{t("opportunityHelp")}</p>
      {(await searchParams).error && <p role="alert">{common("error")}</p>}
      <OpportunityForm workspaceId={w.id} entries={w.entries} />
    </>
  );
}
