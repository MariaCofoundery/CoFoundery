import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireNetworkMember } from "@/features/network/networkAccess";
import { getOwnNetworkListings } from "@/features/network/networkData";
import { NetworkLifecycleForm } from "@/features/network/NetworkLifecycleForm";

export default async function MyNetworkPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getTranslations("network"); const { client, user } = await requireNetworkMember("/network/my");
  const [listings, params] = await Promise.all([getOwnNetworkListings(client, user.id), searchParams]);
  const groups = ["active", "paused", "draft", "completed"] as const;
  return <main className="mx-auto max-w-5xl px-5 py-10">
    <Link href="/network" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("navigation.overview")}</Link>
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.18em] text-slate-500">{t("eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold">{t("my.title")}</h1></div><Link href="/network/listings/new" className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold">{t("my.create")}</Link></div>
    {params.changed ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.lifecycle.${params.changed}`)}</p> : null}
    {params.error ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${params.error}`)}</p> : null}
    {groups.map((status) => {
      const rows = listings.filter((listing) => status === "completed"
        ? listing.status === "completed" || (listing.status === "active" && Boolean(listing.expires_at && new Date(listing.expires_at) <= new Date()))
        : listing.status === status && !(status === "active" && listing.expires_at && new Date(listing.expires_at) <= new Date()));
      return <section key={status} className="mt-8"><h2 className="text-lg font-semibold">{t(`statuses.${status}`)}</h2>{rows.length ? <div className="mt-3 space-y-3">{rows.map((listing) => { const expired = listing.status === "active" && Boolean(listing.expires_at && new Date(listing.expires_at) <= new Date()); return <article key={listing.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{t(`directions.${listing.direction}`)} · {t(`categories.${listing.category}`)}</p><h3 className="mt-2 font-semibold">{listing.title || t("my.untitled")}</h3></div><div className="flex flex-wrap items-center gap-2"><Link href={`/network/listings/${listing.id}`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-2 text-sm">{t("actions.details")}</Link><Link href={`/network/listings/${listing.id}/edit`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-2 text-sm">{t("actions.edit")}</Link><NetworkLifecycleForm id={listing.id} status={expired ? "expired" : listing.status} t={t} /></div></div></article>; })}</div> : <p className="mt-2 text-sm text-slate-500">{t("my.empty")}</p>}</section>;
    })}
  </main>;
}
