import Link from "next/link"; import { notFound } from "next/navigation"; import { getLocale, getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess"; import { getConnectBlockState, getConnectListing, countContactRequestsForListing, getOwnContactRequestForListing, hasActiveConnectProfile } from "@/features/connect/connectData";
import { formatConnectContentTimeframe, normalizeConnectLocations } from "@/features/connect/connectPresentation";
import type { ConnectProfile } from "@/features/connect/connectTypes";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import { DisclosedCapability } from "@/features/capability/DisclosedCapability";
import { getDisclosedCapability } from "@/features/capability/capabilityData";
import { knownKey } from "@/i18n/knownKey";
import { CONNECT_PUBLICATION_KEYS } from "@/features/connect/connectFeedbackKeys";
import { getAiAvailability } from "@/features/ai/aiAvailability";
import { getListingAiJobState } from "@/features/connect/connectAiData";
import { ListingAiSection } from "@/features/connect/ListingAiSection";
export default async function ListingDetail({ params, searchParams }: { params: Promise<{listingId:string}>; searchParams: Promise<Record<string,string|undefined>> }) {
  const { listingId } = await params; const [t, locale, query] = await Promise.all([getTranslations("connect"), getLocale(), searchParams]); const { client, user } = await requireConnectMember(`/connect/listings/${listingId}`); const listing = await getConnectListing(client, listingId); if (!listing) notFound();
  const profileValue = listing.network_profiles; const profile = (Array.isArray(profileValue) ? profileValue[0] : profileValue) as ConnectProfile | null;
  const own = listing.owner_user_id === user.id;
  // Bedingungen prueft get_disclosed_capability; nur beim eigenen Eintrag wird gar nicht gefragt.
  const disclosedCapability = own ? [] : await getDisclosedCapability(client, listing.owner_user_id, "connect");
  const capabilityT = await getTranslations("capability");
  // Auch hier vorher statt hinterher: Der Knopf soll nicht "Kontakt aufnehmen"
  // sagen und dann auf eine Seite fuehren, die zuerst ein Profil verlangt.
  const [contactRequest, blockState, hasProfile] = own
    ? [null, null, true]
    : await Promise.all([getOwnContactRequestForListing(client, user.id, listing.id), getConnectBlockState(client, listing.owner_user_id), hasActiveConnectProfile(client, user.id)]);
  // Die freiwillige KI-Hilfe: nur fuer den eigenen, veroeffentlichten Eintrag
  // und nur, wenn gerade ein Modell erreichbar ist. Veroeffentlichen allein
  // schickt nichts an eine KI.
  const ownActive = own && listing.status === "active" && Boolean(listing.expires_at && new Date(listing.expires_at) > new Date());
  // Ehrliche Statuszeile nur fuer die einstellende Person: keine Zusage, wann
  // jemand antwortet, sondern was bisher war. Ab dem ersten Tag ohne Meldung.
  const replyCount = ownActive ? await countContactRequestsForListing(client, listing.id) : null;
  const daysOnBoard = listing.published_at ? Math.floor((Date.now() - new Date(listing.published_at).getTime()) / 86400000) : 0;
  const [aiAvailable, aiJobState] = ownActive
    ? await Promise.all([getAiAvailability(client), getListingAiJobState(client, listing.id)])
    : [false, "none" as const];
  const aiNotice = own && (query.ai === "requested" || query.ai === "unavailable" || query.ai === "failed") ? query.ai : null;
  const locations = normalizeConnectLocations(listing.locations);
  const timeframe = formatConnectContentTimeframe(listing.starts_on, listing.ends_on, locale, { from: t("timeframe.from"), until: t("timeframe.until") });
  const framework = [locations.length ? locations.join(" & ") : null, listing.geographic_scope ? t(`scopes.${listing.geographic_scope}`) : null, listing.remote_mode ? t(`remote.${listing.remote_mode}`) : null, timeframe, listing.venture_stage ? t(`stages.${listing.venture_stage}`) : null].filter(Boolean);
  const TILE = "flex min-w-0 flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6";
  const H3 = "text-xl font-semibold leading-tight text-[#0b1f3a]";
  const LABEL = "text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e7a]";
  const BTN_PRIMARY = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white hover:opacity-90";
  const BTN_ON_BRAND = "inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-[18px] text-[15px] font-semibold text-[#4a2fb8]";
  const CHIP = "rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-semibold text-[#33325e]";
  const isPublicLive = listing.visibility === "public" && listing.status === "active" && Boolean(listing.expires_at && new Date(listing.expires_at) > new Date());
  const savedKey = knownKey(query.saved, CONNECT_PUBLICATION_KEYS);
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-9">
      <Link href="/connect" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#5f5e7a] hover:text-[#0b1f3a]">← {t("navigation.overview")}</Link>
      {savedKey ? <p role="status" className="mb-4 mt-3 rounded-2xl bg-[#e3f6ec] p-4 text-sm text-[#17794a]">{t(`success.listing.${savedKey}`)}</p> : null}
      {query.contact === "sent" ? <p className="mb-4 mt-3 rounded-2xl bg-[#e3f6ec] p-4 text-sm text-[#17794a]">{t("contact.sent")}</p> : null}
      {aiNotice ? <p role="status" className="mb-4 mt-3 rounded-2xl bg-[#f1f0f7] p-4 text-sm text-[#33325e]">{t(`resources.notice.${aiNotice}`)}</p> : null}

      <header className="brand-panel relative mt-3 overflow-hidden rounded-[28px] px-6 py-8 sm:px-9">
        <span aria-hidden="true" className="orb -top-16 right-16 hidden h-44 w-44 md:block" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[13px] font-semibold text-[#4a2fb8]">{t(`directions.${listing.direction}`)}</span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[13px] font-semibold text-white">{t(`categories.${listing.category}`)}</span>
          </div>
          {own ? (
            <div className="flex flex-wrap gap-2">
              {isPublicLive ? <Link href={`/connect/l/${listing.public_slug}`} className={BTN_ON_BRAND}>{t("visibility.openPublicPage")}</Link> : null}
              <Link href={`/connect/listings/${listing.id}/edit`} className={BTN_ON_BRAND}>{t("actions.edit")}</Link>
            </div>
          ) : null}
        </div>
        <h1 className="mt-3 max-w-3xl text-[30px] font-semibold leading-[1.2] sm:text-[34px]">{listing.title}</h1>
        {framework.length ? <p className="mt-3 text-[15px] text-white opacity-95">{framework.join(" · ")}</p> : null}
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {ownActive && replyCount === 0 && daysOnBoard >= 1 ? (
            <p role="status" className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {t(daysOnBoard >= 7 ? "detail.noReplyLong" : "detail.noReply", { days: daysOnBoard })}
            </p>
          ) : null}
          <section className={TILE}>
            <h2 className={H3}>{t("detail.what")}</h2>
            <p className="whitespace-pre-wrap text-base leading-[1.65] text-[#0b1f3a]">{listing.summary}</p>
          </section>
          {listing.topics.length ? (
            <section className={TILE}>
              <h2 className={H3}>{t("detail.topics")}</h2>
              <div className="flex flex-wrap gap-1.5">{listing.topics.map((v) => <span key={v} className={CHIP}>{v}</span>)}</div>
            </section>
          ) : null}
          {listing.industries.length ? (
            <section className={TILE}>
              <h2 className={H3}>{t("detail.industries")}</h2>
              <p className="text-[#5f5e7a]">{listing.industries.join(" · ")}</p>
            </section>
          ) : null}
          {ownActive && aiAvailable ? <ListingAiSection listingId={listing.id} jobState={aiJobState} /> : null}
          <DisclosedCapability
            rows={disclosedCapability}
            copy={{
              title: capabilityT("foreign.title"),
              familyLabel: (familyId) => capabilityT(`families.${familyId}`),
              areaLabel: (areaId) => capabilityT(`areaLabels.${areaId}`),
              levelLabel: (level) => capabilityT(`levels.${level}`),
              ownershipLabel: (wish) => capabilityT(`ownershipWishes.${wish}`),
            }}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {profile ? (
            <section className={TILE}>
              <p className={LABEL}>{t("detail.person")}</p>
              <div className="flex items-center gap-3.5">
                <ConnectAvatar profile={profile} displayName={profile.display_name} className="h-14 w-14 rounded-full object-cover" />
                <div className="min-w-0">
                  <h2 className="break-words text-[19px] font-semibold leading-tight text-[#0b1f3a]">{profile.display_name}</h2>
                  <p className="mt-0.5 text-sm text-[#5f5e7a]">{profile.headline}</p>
                </div>
              </div>
              {profile.bio ? <p className="text-[15px] leading-7 text-[#0b1f3a]">{profile.bio}</p> : null}
              {/* Hier faellt die Entscheidung, ob man schreibt - also steht hier auch,
                  in welcher Form diese Person ansprechbar ist. Genau das nimmt der
                  ersten Nachricht die Huerde. */}
              {profile.open_to_formats?.length ? (
                <div>
                  <p className={LABEL}>{t("profile.openToHeading")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.open_to_formats.map((format) => <span key={format} className="rounded-full bg-[#efeafd] px-2.5 py-0.5 text-[13px] font-semibold text-[#4a2fb8]">{t(`profile.openTo.${format}`)}</span>)}
                  </div>
                </div>
              ) : null}
              {profile.network_reach ? (
                <div>
                  <p className={LABEL}>{t("profile.reachHeading")}</p>
                  <p className="mt-1 text-[15px] leading-7 text-[#0b1f3a]">{profile.network_reach}</p>
                </div>
              ) : null}
              {profile.contact_note ? (
                <div>
                  <p className={LABEL}>{t("profile.contactNoteHeading")}</p>
                  <p className="mt-1 text-[15px] leading-7 text-[#0b1f3a]">{profile.contact_note}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          {!own ? <section className={`${TILE} border-[#d9cff8] bg-[#f5f2fe]`}>
              {blockState?.interaction_blocked ? (
                <p className="text-sm text-[#5f5e7a]">{t("safety.blockedState")}</p>
              ) : !contactRequest ? (
                hasProfile ? <Link href={`/connect/listings/${listing.id}/contact`} className={BTN_PRIMARY}>{t("contact.cta")}</Link> : (
                  <div>
                    <p className="text-sm leading-6 text-[#33325e]">{t("contact.profileRequiredText")}</p>
                    <Link href={`/connect/profile?next=${encodeURIComponent(`/connect/listings/${listing.id}/contact`)}`} className={`${BTN_PRIMARY} mt-3`}>{t("contact.profileRequiredCta")}</Link>
                  </div>
                )
              ) : (
                <div>
                  <p className="text-[17px] font-semibold text-[#0b1f3a]">{t(`contact.listingStatus.${contactRequest.status}`)}</p>
                  <p className="mt-1 text-sm text-[#5f5e7a]">{t(`contact.statusText.${contactRequest.status}`)}</p>
                  <Link href="/connect/contacts" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#6d49e0] hover:underline">{t("contact.openContacts")}</Link>
                </div>
              )}
            </section> : null}
        </div>
      </div>
    </main>
  );
}
