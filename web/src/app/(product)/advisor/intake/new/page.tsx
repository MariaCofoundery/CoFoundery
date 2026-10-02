import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { intakeSession } from "@/features/team-intake/data";
import {
  IntakeInviteForm,
  type IntakeOptions,
} from "@/features/team-intake/InviteForm";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Page() {
  const { client } = await intakeSession("/advisor/intake/new");
  const t = await getTranslations("intake");
  const { data, error } = await client.rpc("get_team_intake_options");
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link href="/team-intake" className="underline">
        {t("back")}
      </Link>
      <h1 className="text-3xl font-semibold">{t("new")}</h1>
      <p>{t("intro")}</p>
      {error || !data ? (
        <p role="alert">{t("error")}</p>
      ) : (
        <IntakeInviteForm options={data as IntakeOptions} />
      )}
    </main>
  );
}
