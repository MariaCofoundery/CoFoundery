import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { intakeSession } from "@/features/team-intake/data";
import type { IntakeRound } from "@/features/team-intake/model";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invalid?: string }>;
}) {
  const { client } = await intakeSession();
  const t = await getTranslations("intake");
  const { data, error } = await client.rpc("list_team_intakes");
  const rounds = (data ?? []) as IntakeRound[];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p>{t("intro")}</p>
      <Link
        className="inline-block min-h-11 py-3 underline"
        href="/advisor/intake/new"
      >
        {t("new")}
      </Link>
      {(await searchParams).invalid && <p role="alert">{t("invalidInvite")}</p>}
      {error ? (
        <p role="alert">{t("error")}</p>
      ) : rounds.length ? (
        <ul className="space-y-4">
          {rounds.map((r) => (
            <li key={r.id} className="rounded-2xl border p-4">
              <Link
                className="block py-2 text-xl font-semibold underline"
                href={`/team-intake/${r.id}`}
              >
                {r.name}
              </Link>
              <p>
                {t(r.mode)} · {t(r.status)}
              </p>
              <p>
                {t("progress", {
                  done: r.participants.filter((p) => p.submitted).length,
                  total: r.participants.length,
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("empty")}</p>
      )}
    </>
  );
}
