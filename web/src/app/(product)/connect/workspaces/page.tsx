import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { workspaceSession } from "@/features/connect/workspaces/data";
import type { WorkspaceSummary } from "@/features/connect/workspaces/model";
import { card, button } from "@/features/connect/workspaces/styles";
import { IconTile, type IconName, type IconTone } from "@/features/ui/Icons";

// "So funktioniert ein Arbeitsraum" (Feedback an Maria, 04.11.2026: "muss besser erklaert werden").
const EXPLAIN: { key: "what" | "contents" | "who" | "out"; icon: IconName; tone: IconTone }[] = [
  { key: "what", icon: "book", tone: "violet" },
  { key: "contents", icon: "pencil", tone: "teal" },
  { key: "who", icon: "team", tone: "blue" },
  { key: "out", icon: "lock", tone: "amber" },
];
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
      <header className="brand-panel rounded-[28px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-white">{t("intro")}</p>
      </header>
      {/* Ohne eigenen Arbeitsraum steht die Erklaerung offen, sonst eingeklappt. */}
      <details className="group rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-6" open={!list.error && !list.data?.length}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-lg font-semibold text-[#0b1f3a] [&::-webkit-details-marker]:hidden">
          {t("explain.title")}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </summary>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {EXPLAIN.map((item) => (
            <li key={item.key} className="flex items-start gap-3">
              <IconTile name={item.icon} tone={item.tone} size="sm" />
              <div className="min-w-0">
                <p className="font-semibold text-[#0b1f3a]">{t(`explain.items.${item.key}.title`)}</p>
                <p className="mt-0.5 text-sm leading-6 text-slate-600">{t(`explain.items.${item.key}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-2xl bg-[#f7f6fb] px-4 py-3 text-sm leading-6 text-slate-700">{t("explain.example")}</p>
      </details>
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
