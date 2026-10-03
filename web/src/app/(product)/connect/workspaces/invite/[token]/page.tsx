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
      <h1 className="text-3xl font-semibold">{t("claimTitle")}</h1>
      <p>{t("claimHelp")}</p>
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
