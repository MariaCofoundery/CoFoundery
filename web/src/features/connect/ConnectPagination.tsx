import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { connectPage, connectPageHref, CONNECT_PAGE_SIZE } from "@/features/connect/connectBrowsePage";
export async function ConnectPagination({ path, filters, count, pageSize = CONNECT_PAGE_SIZE }: { path: string; filters: Record<string, string | undefined>; count: number; pageSize?: number }) {
  const t = await getTranslations("connect"); const page = connectPage(filters.page);
  return <nav aria-label={t("beta.page", { page, count: Math.min(count, pageSize) })} className="my-6 flex flex-wrap items-center gap-4 text-sm">
    <p>{t("beta.page", { page, count: Math.min(count, pageSize) })}</p>
    {page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-full border px-4" href={connectPageHref(path, filters, page - 1)}>{t("beta.previous")}</Link> : null}
    {count > pageSize ? <Link className="inline-flex min-h-11 items-center rounded-full border px-4" href={connectPageHref(path, filters, page + 1)}>{t("beta.next")}</Link> : null}
  </nav>;
}
