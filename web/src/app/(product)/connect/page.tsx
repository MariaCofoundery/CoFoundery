import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getActiveConnectListings, getIncomingPendingConnectContactCount, getUnreadConnectMessageCount } from "@/features/connect/connectData";
import { ConnectListingCard } from "@/features/connect/ConnectListingCard";
import { CONNECT_CATEGORIES, CONNECT_DIRECTIONS, CONNECT_GEOGRAPHIC_SCOPES, CONNECT_REMOTE_MODES } from "@/features/connect/connectTypes";
import { coFounderBridgeHref } from "@/features/connect/connectTypes";
import { getConnectAttentionCount } from "@/features/connect/connectPresentation";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { hasProfileRole } from "@/features/profile/profileRoles";
import { CapabilityAreaPicker } from "@/features/capability/CapabilityAreaPicker";
import { getCapabilityVocabulary } from "@/features/capability/capabilityData";
import { ConnectTabs } from "@/features/connect/ConnectTabs";
import { getConnectTabCounts } from "@/features/connect/connectPeopleData";
import { saveConnectSearchAction } from "@/features/connect/savedSearchActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

const card = "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,.05)]";
const action = "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold focus-visible:ring-4 focus-visible:ring-amber-200";
const field = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
export default async function ConnectPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [t, locale, filters] = await Promise.all([getTranslations("connect"), getLocale(), searchParams]);
  // Ist ueberhaupt etwas eingegrenzt? Entscheidet, welcher Leerzustand gilt.
  const isFiltered = ["q", "direction", "category", "remote_mode", "geographic_scope", "topic", "industry"]
    .some((key) => (filters[key] ?? "").trim().length > 0);
  const { client, user } = await requireConnectMember(); const [listings, baseProfile, incomingContacts, unreadMessages, capabilityVocabulary, tabCounts] = await Promise.all([getActiveConnectListings(client, filters), getProfileBasicsRow(client, user.id).catch(() => null), getIncomingPendingConnectContactCount(client, user.id), getUnreadConnectMessageCount(client), getCapabilityVocabulary(client), getConnectTabCounts(client, user.id)]);
  // Wie viele Kriterien gesetzt sind - danach richtet sich, ob die
  // Eingrenzung offen oder eingeklappt erscheint.
  const activeFilterCount = ["direction", "category", "remote_mode", "geographic_scope", "topic", "industry"].filter((key) => (filters[key] ?? "").trim().length > 0).length;
  const connectAttentionCount = getConnectAttentionCount(incomingContacts, unreadMessages);
  const cofounderHref = coFounderBridgeHref(hasProfileRole(baseProfile?.roles, "founder"));
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,.13),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ---------------------------------------------------------------
          Zwei Haelften, und sie sahen gleich aus.

          Vorher standen die drei Knoepfe zum Einstellen direkt ueber der
          Reiterleiste und die wiederum direkt ueber dem Suchfeld: drei
          Reihen Bedienelemente hintereinander, alle gleich gewichtet. Man
          musste lesen, um zu verstehen, was wovon ist.

          Jetzt zuerst SELBST ETWAS BEITRAGEN - abgesetzt in einem eigenen
          Kasten mit Ueberschrift -, dann eine Trennlinie, dann SCHAUEN, WAS
          DA IST mit Reitern, Suche und Treffern.
          --------------------------------------------------------------- */}
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-.04em]">{t("title")}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{t("subtitle")}</p>
          </div>
          {connectAttentionCount > 0 ? <Link href="/connect/contacts" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700 underline-offset-4 hover:underline">{t("actions.contacts")}<span aria-label={t("messages.attentionCount", { count: connectAttentionCount })} className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[.68rem] font-bold leading-none text-white">{Math.min(connectAttentionCount, 99)}</span></Link> : null}
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200/70 bg-white/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{t("post.title")}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("post.text")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href="/connect/listings/new?direction=seeking" className={`${action} bg-[color:var(--brand-primary)] text-slate-950`}>{t("actions.seek")}</Link>
          <Link href="/connect/listings/new?direction=offering" className={`${action} border border-slate-200 bg-white text-slate-800`}>{t("actions.offer")}</Link>
          <Link href={cofounderHref} className={`${action} border border-violet-200 bg-violet-50 text-violet-800`}>{t("actions.cofounder")}</Link>
        </div>
      </section>

      <div className="border-t border-slate-200/80 pt-7">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">{t("browse.title")}</p>
        <div className="mt-4">
          <ConnectTabs active="listings" counts={tabCounts} />
        </div>
      </div>

      {/* Ein Suchfeld oben, die Eingrenzung eingeklappt. Vorher war es ein
          Formular mit fuenf Feldern ueber den Treffern - das fuehlt sich an
          wie Ausfuellen, nicht wie Anfassen. */}
      <section className={card}><form className="grid gap-3">
        <input
          name="q"
          type="search"
          defaultValue={filters.q}
          className={`${field} sm:col-span-2 lg:col-span-4`}
          placeholder={t("filters.search")}
          aria-label={t("filters.search")}
        />
        <details className="mt-1" open={activeFilterCount > 0}>
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">{t("filtersLabel")}{activeFilterCount ? ` (${activeFilterCount})` : ""}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select name="direction" defaultValue={filters.direction || ""} className={field} aria-label={t("filters.direction")}><option value="">{t("filters.allDirections")}</option>{CONNECT_DIRECTIONS.map((v) => <option key={v} value={v}>{t(`directions.${v}`)}</option>)}</select>
        <select name="category" defaultValue={filters.category || ""} className={field} aria-label={t("filters.category")}><option value="">{t("filters.allCategories")}</option>{CONNECT_CATEGORIES.map((v) => <option key={v} value={v}>{t(`categories.${v}`)}</option>)}</select>
        <select name="geographic_scope" defaultValue={filters.geographic_scope || ""} className={field} aria-label={t("filters.scope")}><option value="">{t("filters.allScopes")}</option>{CONNECT_GEOGRAPHIC_SCOPES.map((v) => <option key={v} value={v}>{t(`scopes.${v}`)}</option>)}</select>
        <select name="remote_mode" defaultValue={filters.remote_mode || ""} className={field} aria-label={t("filters.remote")}><option value="">{t("filters.allRemote")}</option>{CONNECT_REMOTE_MODES.map((v) => <option key={v} value={v}>{t(`remote.${v}`)}</option>)}</select>
        </div>
        </details>
        <div className="flex flex-wrap items-center gap-3">
          <button className="min-h-11 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white">{t("filters.apply")}</button>
          {isFiltered ? <Link href="/connect" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 underline underline-offset-2">{t("empty.reset")}</Link> : null}
          <span className="ml-auto text-sm text-slate-500">{t("resultCount", { count: listings.length })}</span>
        </div>
      </form>
        {/* Speichern, was gerade eingegrenzt ist - die Kriterien stehen schon
            da, niemand soll sie ein zweites Mal eingeben. */}
        <form action={saveConnectSearchAction} className="mt-4 border-t border-slate-100 pt-4">
          <input type="hidden" name="q" value={filters.q ?? ""} />
          <input type="hidden" name="direction" value={filters.direction ?? ""} />
          <input type="hidden" name="category" value={filters.category ?? ""} />
          <input type="hidden" name="geographic_scope" value={filters.geographic_scope ?? ""} />
          <input type="hidden" name="remote_mode" value={filters.remote_mode ?? ""} />
          <input type="hidden" name="topics" value={filters.topic ?? ""} />
          <input type="hidden" name="industries" value={filters.industry ?? ""} />
          <input type="hidden" name="include_listings" value="1" />
          <input type="hidden" name="include_problems" value="1" />
          <p className="text-sm font-semibold">{t("rememberSearch")}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t("searches.saveText")}</p>
          {/* Die Faehigkeiten waren bisher nur eine Spalte in der Datenbank -
              ohne diese Auswahl liess sich das Kriterium nirgends setzen. */}
          <div className="mt-3">
            <CapabilityAreaPicker
              families={capabilityVocabulary.families}
              areas={capabilityVocabulary.areas}
              title={t("searches.capabilitiesTitle")}
              text={t("searches.capabilitiesText")}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input name="label" required minLength={2} maxLength={80} className={field} placeholder={t("searches.labelPlaceholder")} aria-label={t("searches.labelPlaceholder")} />
            <SubmitButton label={t("searches.save")} pendingLabel={t("pending.save")} className={`${action} border border-slate-200`} />
          </div>
        </form>
        <Link href="/connect/searches" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline">{t("searches.open")}</Link>
      </section>
      {listings.length ? <section aria-label={t("browseTitle")} className="grid gap-4 md:grid-cols-2">{listings.map((listing) => <ConnectListingCard key={listing.id} listing={listing} t={t} locale={locale} />)}</section> : <section className={`${card} text-center`}>
        {/* Zwei verschiedene Leerzustaende, die vorher gleich aussahen.
            Wer ohne Filter auf eine leere Flaeche kommt, ist der erste
            Mensch hier - "kein Eintrag passt zu allen Kriterien" und ein
            Knopf "Filter zuruecksetzen", der nichts tut, liest sich dann
            wie eine Stoerung. */}
        <h2 className="text-xl font-semibold">{t(isFiltered ? "empty.title" : "empty.firstTitle")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t(isFiltered ? "empty.text" : "empty.firstText")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {isFiltered ? <Link href="/connect" className={`${action} border border-slate-200`}>{t("empty.reset")}</Link> : null}
          <Link href="/connect/listings/new?direction=seeking" className={`${action} bg-[color:var(--brand-primary)]`}>{t("empty.createSeeking")}</Link>
          <Link href="/connect/listings/new?direction=offering" className={`${action} border border-slate-200`}>{t("empty.createOffering")}</Link>
        </div>
      </section>}
    </div>
  </main>;
}
