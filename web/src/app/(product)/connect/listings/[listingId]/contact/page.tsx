import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { requestConnectContactAction } from "@/features/connect/connectActions";
import { getConnectListing, getOwnContactRequestForListing, hasActiveConnectProfile } from "@/features/connect/connectData";
import { ConnectProfileRequired } from "@/features/connect/ConnectProfileRequired";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";
import type { ConnectProfile } from "@/features/connect/connectTypes";
import { knownKey } from "@/i18n/knownKey";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";

export default async function ConnectContactCreatePage({ params, searchParams }: { params: Promise<{ listingId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { listingId } = await params; const [t, query] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client, user } = await requireConnectMember(`/connect/listings/${listingId}/contact`);
  // Die Profilpruefung steht vor dem Formular, nicht dahinter: Vorher konnte
  // man eine Nachricht fertig schreiben und erfuhr erst beim Absenden, dass
  // ein aktives Connect-Profil fehlt.
  const [listing, existing, hasProfile] = await Promise.all([getConnectListing(client, listingId), getOwnContactRequestForListing(client, user.id, listingId), hasActiveConnectProfile(client, user.id)]);
  if (!listing) notFound();
  if (listing.owner_user_id === user.id || existing) redirect(`/connect/listings/${listingId}`);
  const profileValue = listing.network_profiles; const recipient = (Array.isArray(profileValue) ? profileValue[0] : profileValue) as ConnectProfile | null;
  return <main className="min-h-screen bg-slate-50 px-5 py-9"><div className="mx-auto max-w-2xl">
    <Link href={`/connect/listings/${listingId}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {t("contact.backToListing")}</Link>
    <section className="mt-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">{t("contact.eyebrow")}</p>
      <h1 className="mt-3 text-3xl font-semibold">{t("contact.createTitle")}</h1>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-950">{listing.title}</p>{recipient ? <p className="mt-1 text-sm text-slate-600">{recipient.display_name} · {recipient.headline}</p> : null}</div>
      {knownKey(query.error, CONNECT_ERROR_KEYS) ? <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${knownKey(query.error, CONNECT_ERROR_KEYS)}`)}</p> : null}
      {!hasProfile ? (
        <ConnectProfileRequired
          returnTo={`/connect/listings/${listingId}/contact`}
          copy={{
            title: t("contact.profileRequiredTitle"),
            text: t("contact.profileRequiredText"),
            cta: t("contact.profileRequiredCta"),
          }}
        />
      ) : (
      <form action={requestConnectContactAction} className="mt-6">
        <input type="hidden" name="listing_id" value={listing.id} />
        <label className="block text-sm font-medium text-slate-900">{t("contact.messageLabel")}
          <textarea name="message" required minLength={10} maxLength={500} rows={6} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100" />
          <span className="mt-2 block text-xs leading-5 text-slate-500">{t("contact.messageHint")}</span>
        </label>
        <ConnectSubmitButton label={t("contact.send")} pendingLabel={t("contact.sending")} className="mt-5 min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold" />
      </form>
      )}
    </section>
  </div></main>;
}
