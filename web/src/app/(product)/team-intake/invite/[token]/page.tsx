import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { intakeSession } from "@/features/team-intake/data";
import { claimIntakeAction } from "@/features/team-intake/actions";
import { button } from "@/features/team-intake/Answers";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  await intakeSession(`/team-intake/invite/${token}`);
  const t = await getTranslations("intake");
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("inviteTitle")}</h1>
      <p>{t("inviteIntro")}</p>
      <form action={claimIntakeAction.bind(null, token)}>
        <button className={button}>{t("claim")}</button>
      </form>
    </>
  );
}
