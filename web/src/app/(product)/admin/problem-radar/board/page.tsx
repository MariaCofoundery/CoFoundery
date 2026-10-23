import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";

type Topic = { topic: string | null; count: number; items: Array<{ id: string; title: string; published_at: string | null }> };

/**
 * Das Problembrett nach Themen.
 *
 * Nur, was Mitglieder ohnehin lesen duerfen, ohne Namen. Die Themen stehen in
 * alphabetischer Reihenfolge und nicht nach Haeufigkeit: Eine Rangliste nach
 * Zuspruch soll das Brett nicht sein, auch nicht fuer dich.
 */
export default async function ProblemBoardPage() {
  const client = await requirePlatformAdmin();
  const [t, locale, { data, error }] = await Promise.all([getTranslations("radar.board"), getLocale(), client.rpc("admin_problem_board_topics")]);
  const topics = (data ?? []) as Topic[];
  const day = (value: string | null) => (value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "");
  return <>
    <h2 className="mt-6 text-xl font-semibold">{t("title")}</h2>
    <p className="my-3 text-sm leading-6 text-slate-600">{t("intro")}</p>
    {error ? <p role="alert">{t("loadError")}</p> : topics.length === 0 ? <p className="py-6">{t("empty")}</p> : <div className="space-y-4">
      {topics.map((group) => <details key={group.topic ?? "untagged"} className="rounded-2xl border p-4" open={topics.length <= 6}>
        <summary className="cursor-pointer text-base font-semibold">{group.topic ?? t("untagged")} <span className="text-sm font-normal text-slate-500">({group.count})</span></summary>
        <ul className="mt-3 space-y-2">
          {group.items.slice(0, 20).map((item) => <li key={item.id} className="text-sm">
            <Link href={`/connect/problems/${item.id}`} className="underline">{item.title}</Link>
            {item.published_at ? <span className="text-slate-500"> · {day(item.published_at)}</span> : null}
          </li>)}
          {group.items.length > 20 ? <li className="text-xs text-slate-500">{t("more", { count: group.items.length - 20 })}</li> : null}
        </ul>
      </details>)}
    </div>}
  </>;
}
