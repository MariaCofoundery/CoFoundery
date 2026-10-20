import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { workspaceSession } from "@/features/connect/workspaces/data";
import { claimWorkspaceInviteAction } from "@/features/connect/workspaces/actions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { button } from "@/features/connect/workspaces/styles";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  await workspaceSession(`/connect/workspaces/invite/${token}`);
  const t = await getTranslations("problemWorkspace");
  return (
    <>
      <Link href="/connect/workspaces" className="inline-block min-h-11 py-3 underline">
        ← {t("title")}
      </Link>
      <header className="brand-panel rounded-[28px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{t("claimTitle")}</h1>
        <p className="mt-3 text-white">{t("claimHelp")}</p>
      </header>
      <form action={claimWorkspaceInviteAction.bind(null, token)}>
        <SubmitButton
          label={t("claim")}
          pendingLabel={t("saving")}
          className={button}
        />
      </form>
    </>
  );
}
