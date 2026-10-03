import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { workspaceSession } from "@/features/connect/workspaces/data";
import type { WorkspaceSummary } from "@/features/connect/workspaces/model";
import { card, button } from "@/features/connect/workspaces/styles";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invalid?: string }>;
}) {
  const { client } = await workspaceSession();
  const t = await getTranslations("problemWorkspace");
  const [list, member] = await Promise.all([
    client.rpc("list_problem_workspaces"),
    client.rpc("is_network_member"),
  ]);
  return (
    <>
      <Link href="/connect" className="inline-block min-h-11 py-3 underline">
        {t("browse")}
      </Link>
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p>{t("intro")}</p>
      {member.data === true && (
        <Link href="/connect/workspaces/new" className={button}>
          {t("new")}
        </Link>
      )}
      {(await searchParams).invalid && <p role="alert">{t("invalid")}</p>}
      {list.error ? (
        <p role="alert">{t("error")}</p>
      ) : list.data?.length ? (
        <ul className="space-y-4">
          {(list.data as WorkspaceSummary[]).map((w) => (
            <li key={w.id} className={card}>
              <Link
                href={`/connect/workspaces/${w.id}`}
                className="block break-words text-xl font-semibold underline"
              >
                {w.title}
              </Link>
              <p>
                {t(w.role)} · {t(w.status)}
              </p>
              <p className="text-sm text-slate-600">
                {t("updated")}: {w.updated_at.slice(0, 10)}
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
