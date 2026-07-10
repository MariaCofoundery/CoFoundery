import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActiveDiscoveryProfileById } from "@/features/discovery/discoveryData";
import {
  cancelDiscoveryIntroAction,
  type DiscoveryIntroActionState,
  requestDiscoveryIntroAction,
} from "@/features/discovery/discoveryIntroActions";
import { getDiscoveryIntroRequestForProfile } from "@/features/discovery/discoveryIntroData";
import {
  canCancelDiscoveryIntro,
  type DiscoveryIntroRequest,
} from "@/features/discovery/discoveryIntroTypes";
import type { DiscoveryFounderRole, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { createClient } from "@/lib/supabase/server";

const CARD_CLASS =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6";
const PRIMARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";
const TEXTAREA_CLASS =
  "mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

type DiscoveryT = Awaited<ReturnType<typeof getTranslations>>;

type DiscoveryProfileDetailPageParams = {
  profileId: string;
};

type DiscoveryProfileDetailSearchParams = {
  introMessage?: string | string[];
  introOk?: string | string[];
};

function formatRoleList(values: DiscoveryFounderRole[], t: DiscoveryT) {
  return values.length > 0
    ? values.map((value) => t(`roles.${value}`)).join(", ")
    : t("common.notProvided");
}

function formatText(value: string | null | undefined, t: DiscoveryT) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : t("common.notProvided");
}

function formatIndustries(values: string[], t: DiscoveryT) {
  return values.length > 0 ? values.join(", ") : t("common.notProvided");
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium leading-6 text-slate-900">{value}</dd>
    </div>
  );
}

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function introResultUrl(
  profileId: string,
  result: DiscoveryIntroActionState,
  fallbackMessage: string
) {
  const params = new URLSearchParams();
  params.set("introMessage", result.message ?? fallbackMessage);
  params.set("introOk", result.ok ? "1" : "0");
  return `/discovery/${profileId}?${params.toString()}`;
}

function IntroPageMessage({ message, ok }: { message: string | null; ok: boolean }) {
  if (!message) {
    return null;
  }

  return (
    <section
      className={`rounded-3xl border p-4 ${
        ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className={`text-sm font-semibold ${ok ? "text-emerald-900" : "text-amber-900"}`}>
        {message}
      </p>
    </section>
  );
}

function EmptyState({ t }: { t: DiscoveryT }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-8">
        <Link href="/discovery" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          {t("common.backToDiscovery")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {t("detail.emptyTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("detail.emptyText")}
        </p>
        <div className="mt-6">
          <Link href="/discovery" className={PRIMARY_CTA_CLASS}>
            {t("common.backToDiscovery")}
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProfileDetails({ profile, t }: { profile: FounderDiscoveryProfile; t: DiscoveryT }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      <DetailItem label={t("detail.details.brings")} value={formatRoleList(profile.ownRoles, t)} />
      <DetailItem label={t("detail.details.seeks")} value={formatRoleList(profile.seekingRoles, t)} />
      <DetailItem label={t("detail.details.industries")} value={formatIndustries(profile.industries, t)} />
      <DetailItem label={t("detail.details.location")} value={formatText(profile.locationLabel, t)} />
      <DetailItem label={t("detail.details.remoteMode")} value={t(`remoteModes.${profile.remoteMode}`)} />
      <DetailItem
        label={t("detail.details.availability")}
        value={
          profile.availabilityHoursPerWeek
            ? t("profile.preview.hoursPerWeek", { hours: profile.availabilityHoursPerWeek })
            : t("common.notProvided")
        }
      />
      <DetailItem label={t("detail.details.commitment")} value={t(`commitmentLevels.${profile.commitmentLevel}`)} />
      <DetailItem label={t("detail.details.stage")} value={t(`ventureStages.${profile.ventureStage}`)} />
      <DetailItem label={t("detail.details.goal")} value={t(`ventureGoals.${profile.ventureGoal}`)} />
    </dl>
  );
}

function IntroRequestCard({
  profile,
  introRequest,
  t,
  fallbackMessage,
}: {
  profile: FounderDiscoveryProfile;
  introRequest: DiscoveryIntroRequest | null;
  t: DiscoveryT;
  fallbackMessage: string;
}) {
  async function requestIntro(formData: FormData) {
    "use server";
    const result = await requestDiscoveryIntroAction(profile.id, formData);
    redirect(introResultUrl(profile.id, result, fallbackMessage));
  }

  if (!introRequest) {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("detail.intro.eyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.intro.requestTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("detail.intro.requestText")}
        </p>
        <form action={requestIntro} className="mt-5 grid gap-4">
          <label>
            <span className="text-sm font-semibold text-slate-900">{t("detail.intro.messageLabel")}</span>
            <textarea
              name="message"
              maxLength={600}
              placeholder={t("detail.intro.messagePlaceholder")}
              className={TEXTAREA_CLASS}
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              {t("detail.intro.messageHelp")}
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={PRIMARY_CTA_CLASS}>
              {t("detail.intro.request")}
            </button>
            <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
              {t("common.myIntros")}
            </Link>
          </div>
        </form>
      </section>
    );
  }

  if (introRequest.status === "accepted") {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {t("introStatus.accepted")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.intro.acceptedTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("detail.intro.acceptedText")}
        </p>
        {introRequest.responseMessage ? (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {t("detail.intro.responsePrefix")} {introRequest.responseMessage}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/discovery/intros/${introRequest.id}/matching`}
            className={PRIMARY_CTA_CLASS}
          >
            {t("common.prepareSharedMatching")}
          </Link>
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            {t("common.myIntros")}
          </Link>
        </div>
      </section>
    );
  }

  if (introRequest.status === "declined") {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("introStatus.declined")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {t("detail.intro.declinedTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("detail.intro.declinedText")}
        </p>
        {introRequest.responseMessage ? (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {t("detail.intro.responsePrefix")} {introRequest.responseMessage}
          </p>
        ) : null}
        <div className="mt-5">
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            {t("common.myIntros")}
          </Link>
        </div>
      </section>
    );
  }

  if (introRequest.status === "canceled") {
    return (
      <section className={CARD_CLASS}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("introStatus.canceled")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.intro.canceledTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("detail.intro.canceledText")}
        </p>
        <div className="mt-5">
          <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
            {t("common.myIntros")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={CARD_CLASS}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
        {t("introStatus.pending")}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("detail.intro.pendingTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {t("detail.intro.pendingText")}
      </p>
      {introRequest.message ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {t("detail.intro.yourMessagePrefix")} {introRequest.message}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        {canCancelDiscoveryIntro(introRequest) ? (
          <form
            action={async () => {
              "use server";
              const result = await cancelDiscoveryIntroAction(introRequest.id);
              redirect(introResultUrl(profile.id, result, fallbackMessage));
            }}
          >
            <button type="submit" className={SECONDARY_CTA_CLASS}>
              {t("detail.intro.cancel")}
            </button>
          </form>
        ) : null}
        <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
          {t("common.myIntros")}
        </Link>
      </div>
    </section>
  );
}

export default async function DiscoveryProfileDetailPage({
  params,
  searchParams,
}: {
  params: Promise<DiscoveryProfileDetailPageParams>;
  searchParams?: Promise<DiscoveryProfileDetailSearchParams>;
}) {
  const t = await getTranslations("discovery");
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const profileId = resolvedParams.profileId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/discovery/${profileId}`)}`);
  }

  const profile = await getActiveDiscoveryProfileById(profileId);
  if (!profile) {
    return <EmptyState t={t} />;
  }

  const isOwner = profile.userId === user.id;
  const introRequest = isOwner
    ? null
    : await getDiscoveryIntroRequestForProfile(user.id, profile.id);
  const introMessage = searchParamValue(resolvedSearchParams.introMessage) ?? null;
  const introOk = searchParamValue(resolvedSearchParams.introOk) !== "0";
  const fallbackIntroMessage = t("intros.defaultActionMessage");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-7 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur md:p-7">
          <Link href="/discovery" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            {t("common.backToDiscovery")}
          </Link>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("detail.eyebrow")}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                {formatText(profile.displayName, t)}
              </h1>
              <p className="mt-3 max-w-3xl text-xl font-semibold leading-8 text-slate-900">
                {formatText(profile.headline, t)}
              </p>
            </div>
            {isOwner ? (
              <Link href="/discovery/profile" className={PRIMARY_CTA_CLASS}>
                {t("detail.editOwn")}
              </Link>
            ) : (
              <Link href="/discovery/intros" className={SECONDARY_CTA_CLASS}>
                {t("common.myIntros")}
              </Link>
            )}
          </div>
        </header>

        <IntroPageMessage message={introMessage} ok={introOk} />

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("detail.shortBio")}
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
            {formatText(profile.bio, t)}
          </p>
        </section>

        <section className={CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("detail.searchProfile")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {t("detail.publishedTitle")}
          </h2>
          <div className="mt-5">
            <ProfileDetails profile={profile} t={t} />
          </div>
        </section>

        {isOwner ? null : (
          <IntroRequestCard
            profile={profile}
            introRequest={introRequest}
            t={t}
            fallbackMessage={fallbackIntroMessage}
          />
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-5">
          <p className="text-sm leading-6 text-slate-600">
            {t("detail.privacy")}
          </p>
        </section>
      </div>
    </main>
  );
}
