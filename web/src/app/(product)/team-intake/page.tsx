import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { intakeSession } from "@/features/team-intake/data";
import type { IntakeRound } from "@/features/team-intake/model";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invalid?: string }>;
}) {
  const { client, user } = await intakeSession();
  const t = await getTranslations("intake");
  // Phase 12C.1C: Angelegt werden Intakes im Advisor-Kontext. Founder erreichen
  // diese Seite als Teilnehmende (Dashboard-Link) und bekamen hier den
  // Advisor-Knopf - ein Kontextwechsel. Nur die Anzeige; die Datenbank
  // entscheidet weiter selbst, wer anlegen darf.
  const { hasAdvisor } = await getDashboardRoleViews(user.id);
  const { data, error } = await client.rpc("list_team_intakes");
  const rounds = (data ?? []) as IntakeRound[];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p>{t("intro")}</p>
      {hasAdvisor ? (
        <Link
          className="inline-block min-h-11 py-3 underline"
          href="/advisor/intake/new"
        >
          {t("new")}
        </Link>
      ) : null}
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
