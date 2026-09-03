import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireNetworkMember } from "@/features/network/networkAccess";
import { requestNetworkContactAction } from "@/features/network/networkActions";
import { getNetworkListing, getOwnContactRequestForListing } from "@/features/network/networkData";
import { NetworkSubmitButton } from "@/features/network/NetworkSubmitButton";
import type { NetworkProfile } from "@/features/network/networkTypes";

export default async function NetworkContactCreatePage({ params, searchParams }: { params: Promise<{ listingId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { listingId } = await params; const [t, query] = await Promise.all([getTranslations("network"), searchParams]);
  const { client, user } = await requireNetworkMember(`/network/listings/${listingId}/contact`);
  const [listing, existing] = await Promise.all([getNetworkListing(client, listingId), getOwnContactRequestForListing(client, user.id, listingId)]);
  if (!listing) notFound();
  if (listing.owner_user_id === user.id || existing) redirect(`/network/listings/${listingId}`);
  const profileValue = listing.network_profiles; const recipient = (Array.isArray(profileValue) ? profileValue[0] : profileValue) as NetworkProfile | null;
  return <main className="min-h-screen bg-slate-50 px-5 py-9"><div className="mx-auto max-w-2xl">
    <Link href={`/network/listings/${listingId}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {t("contact.backToListing")}</Link>
    <section className="mt-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">{t("contact.eyebrow")}</p>
      <h1 className="mt-3 text-3xl font-semibold">{t("contact.createTitle")}</h1>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-950">{listing.title}</p>{recipient ? <p className="mt-1 text-sm text-slate-600">{recipient.display_name} · {recipient.headline}</p> : null}</div>
      {query.error ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${query.error}`)}</p> : null}
      <form action={requestNetworkContactAction} className="mt-6">
        <input type="hidden" name="listing_id" value={listing.id} />
        <label className="block text-sm font-medium text-slate-900">{t("contact.messageLabel")}
          <textarea name="message" required minLength={10} maxLength={500} rows={6} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100" />
          <span className="mt-2 block text-xs leading-5 text-slate-500">{t("contact.messageHint")}</span>
        </label>
        <NetworkSubmitButton label={t("contact.send")} pendingLabel={t("contact.sending")} className="mt-5 min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold" />
      </form>
    </section>
  </div></main>;
}
