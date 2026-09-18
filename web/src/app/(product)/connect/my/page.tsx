import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getOwnConnectListings } from "@/features/connect/connectData";
import { getOwnConnectProblems } from "@/features/connect/connectProblemData";
import { CONNECT_EXPIRY_WARNING_DAYS, getConnectListingDaysLeft } from "@/features/connect/connectPresentation";
import { ConnectLifecycleForm } from "@/features/connect/ConnectLifecycleForm";
import { knownKey } from "@/i18n/knownKey";
import { CONNECT_ERROR_KEYS, CONNECT_LIFECYCLE_KEYS } from "@/features/connect/connectFeedbackKeys";

export default async function MyConnectPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getTranslations("connect"); const { client, user } = await requireConnectMember("/connect/my");
  const [listings, problems, params] = await Promise.all([getOwnConnectListings(client, user.id), getOwnConnectProblems(client, user.id), searchParams]);
  const groups = ["active", "paused", "draft", "completed"] as const;
  return <main className="mx-auto max-w-5xl px-5 py-10">
    <Link href="/connect" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("navigation.overview")}</Link>
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.18em] text-slate-500">{t("eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold">{t("my.title")}</h1></div><Link href="/connect/listings/new" className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold">{t("my.create")}</Link></div>
    {knownKey(params.changed, CONNECT_LIFECYCLE_KEYS) ? <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.lifecycle.${knownKey(params.changed, CONNECT_LIFECYCLE_KEYS)}`)}</p> : null}
    {knownKey(params.error, CONNECT_ERROR_KEYS) ? <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${knownKey(params.error, CONNECT_ERROR_KEYS)}`)}</p> : null}
    {groups.map((status) => {
      const rows = listings.filter((listing) => status === "completed"
        ? listing.status === "completed" || (listing.status === "active" && Boolean(listing.expires_at && new Date(listing.expires_at) <= new Date()))
        : listing.status === status && !(status === "active" && listing.expires_at && new Date(listing.expires_at) <= new Date()));
      return <section key={status} className="mt-8"><h2 className="text-lg font-semibold">{t(`statuses.${status}`)}</h2>{rows.length ? <div className="mt-3 space-y-3">{rows.map((listing) => { const expired = listing.status === "active" && Boolean(listing.expires_at && new Date(listing.expires_at) <= new Date()); return <article key={listing.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{t(`directions.${listing.direction}`)} · {t(`categories.${listing.category}`)}</p><h3 className="mt-2 font-semibold">{listing.title || t("my.untitled")}</h3>
          {/* Wann laeuft sie aus? Ohne diese Angabe kann niemand rechtzeitig
              verlaengern - und der Ablauf nach 60 Tagen war genau dafuer
              gedacht, nicht zum Verschwindenlassen. */}
          {!expired && listing.status === "active" ? (() => {
            const daysLeft = getConnectListingDaysLeft(listing.expires_at);
            if (daysLeft === null) return null;
            const urgent = daysLeft <= CONNECT_EXPIRY_WARNING_DAYS;
            return (
              <p className={`mt-1 text-xs ${urgent ? "font-semibold text-amber-800" : "text-slate-500"}`}>
                {t("my.expiresIn", { days: daysLeft })}
              </p>
            );
          })() : null}</div><div className="flex flex-wrap items-center gap-2"><Link href={`/connect/listings/${listing.id}`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-2 text-sm">{t("actions.details")}</Link><Link href={`/connect/listings/${listing.id}/edit`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-2 text-sm">{t("actions.edit")}</Link><ConnectLifecycleForm id={listing.id} status={expired ? "expired" : listing.status} /></div></div></article>; })}</div> : <p className="mt-2 text-sm text-slate-500">{t("my.empty")}</p>}</section>;
    })}
    {/* Geschilderte Probleme stehen hier und nicht in einer zweiten
        Uebersicht: Ein Ort fuer alles, was man eingestellt hat. Und ohne
        diesen Abschnitt waeren Entwuerfe nur ueber den direkten Link
        erreichbar - eine Funktion, die halb gebaut ist. */}
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("my.problemsTitle")}</h2>
        <Link href="/connect/problems/new" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline">{t("problems.create")}</Link>
      </div>
      {problems.length ? <div className="mt-3 space-y-3">{problems.map((problem) => (
        <article key={problem.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                {t(`problems.intents.${problem.author_intent}`)}
                {problem.status !== "active" ? ` · ${t(`problems.shortStatuses.${problem.status}`)}` : null}
              </p>
              <h3 className="mt-2 font-semibold">{problem.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{t("problems.interestCount", { count: problem.interest_count })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/connect/problems/${problem.id}`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-2 text-sm">{t("actions.details")}</Link>
              <Link href={`/connect/problems/${problem.id}/edit`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-2 text-sm">{t("actions.edit")}</Link>
            </div>
          </div>
        </article>
      ))}</div> : <p className="mt-2 text-sm text-slate-500">{t("my.problemsEmpty")}</p>}
    </section>
  </main>;
}
