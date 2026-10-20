import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { createWorkspaceAction } from "@/features/connect/workspaces/actions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { card, button, field } from "@/features/connect/workspaces/styles";
import { workspaceId } from "@/features/connect/workspaces/model";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; problem?: string }>;
}) {
  await requireConnectMember("/connect/workspaces/new");
  const t = await getTranslations("problemWorkspace");
  const query = await searchParams;
  const problem =
    query.problem && workspaceId(query.problem) ? query.problem : "";
  return (
    <>
      <Link href="/connect/workspaces" className="underline">
        {t("back")}
      </Link>
      <header className="brand-panel rounded-[28px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{t("new")}</h1>
        <p className="mt-3 text-white">{t("privacy")}</p>
      </header>
      {query.error && <p role="alert">{t("error")}</p>}
      {problem && <p>{t("sourceNotice")}</p>}
      <form action={createWorkspaceAction} className={card}>
        <input type="hidden" name="problem" value={problem} />
        <label className="block">
          {t("name")}
          <input name="title" required maxLength={160} className={field} />
        </label>
        <label className="block">
          {t("description")}
          <textarea
            name="description"
            maxLength={3000}
            rows={4}
            className={field}
          />
        </label>
        <SubmitButton
          label={t("create")}
          pendingLabel={t("saving")}
          className={button}
        />
      </form>
    </>
  );
}
