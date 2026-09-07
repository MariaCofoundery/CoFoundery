import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicConnectAvatar, PublicConnectShell } from "@/features/connect/PublicConnectShell";
import { getPublicConnectProfile, getPublicConnectProfileListings } from "@/features/connect/publicConnectData";
import { createClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ publicSlug: string }> }): Promise<Metadata> {
  const { publicSlug } = await params;
  const profile = await getPublicConnectProfile(await createClient(), publicSlug).catch(() => null);
  if (!profile) return { title: "Connect | CoFoundery", robots: { index: false, follow: false } };
  const canonical = `${getPublicAppOrigin()}/connect/p/${profile.public_slug}`;
  return {
    title: `${profile.display_name} – ${profile.headline} | CoFoundery Connect`,
    description: profile.bio.slice(0, 155),
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function PublicConnectProfilePage({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const client = await createClient();
  const [t, profile, listings] = await Promise.all([
    getTranslations("connect"),
    getPublicConnectProfile(client, publicSlug).catch(() => null),
    getPublicConnectProfileListings(client, publicSlug).catch(() => []),
  ]);
  if (!profile) notFound();

  return <PublicConnectShell><main className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14">
    <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">{t("public.profileEyebrow")}</p>
    <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-9">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <PublicConnectAvatar src={null} displayName={profile.display_name} className="h-20 w-20" />
        <div><h1 className="text-3xl font-semibold tracking-tight">{profile.display_name}</h1><p className="mt-2 text-lg text-slate-600">{profile.headline}</p></div>
      </div>
      <p className="mt-7 whitespace-pre-wrap leading-7 text-slate-700">{profile.bio}</p>
      {profile.network_roles.length ? <div className="mt-6 flex flex-wrap gap-2">{profile.network_roles.map((role) => <span key={role} className="rounded-full bg-violet-50 px-3 py-1 text-sm text-violet-800">{t(`roles.${role}`)}</span>)}</div> : null}
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        {profile.expertise.length ? <section><h2 className="font-semibold">{t("detail.topics")}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{profile.expertise.join(" · ")}</p></section> : null}
        {profile.industries.length ? <section><h2 className="font-semibold">{t("detail.industries")}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{profile.industries.join(" · ")}</p></section> : null}
        {profile.location_region ? <section><h2 className="font-semibold">{t("public.region")}</h2><p className="mt-2 text-sm text-slate-600">{profile.location_region}</p></section> : null}
      </div>
    </article>
    {listings.length ? <section className="mt-10"><h2 className="text-2xl font-semibold">{t("public.publicListings")}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{listings.map((listing) => <article key={listing.public_slug} className="rounded-3xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[.14em] text-violet-700">{t(`directions.${listing.direction}`)} · {t(`categories.${listing.category}`)}</p><h3 className="mt-3 text-xl font-semibold">{listing.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{listing.summary}</p><Link href={`/connect/l/${listing.public_slug}`} className="mt-5 inline-flex min-h-11 items-center font-semibold text-violet-800 hover:underline">{t("actions.details")}</Link></article>)}</div></section> : null}
    <section className="mt-10 rounded-3xl bg-slate-900 p-6 text-white md:p-8"><h2 className="text-xl font-semibold">{t("public.aboutTitle")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("public.aboutText")}</p><Link href="/start?intent=connect" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 font-semibold text-slate-900">{t("public.joinConnect")}</Link></section>
  </main></PublicConnectShell>;
}
