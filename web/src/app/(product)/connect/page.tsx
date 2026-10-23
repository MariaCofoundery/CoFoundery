import { ConnectPagination } from "@/features/connect/ConnectPagination";
import { CONNECT_PAGE_SIZE } from "@/features/connect/connectBrowsePage";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getIncomingPendingConnectContactCount, getUnreadConnectMessageCount } from "@/features/connect/connectData";
import { getConnectFeed, getConnectFilterOptions } from "@/features/connect/connectFeedData";
import { DEFAULT_FEED_KINDS, FEED_KINDS, FEED_WORK, parseFeedKinds, parseFeedWork } from "@/features/connect/connectFeedModel";
import { ConnectFeedRow } from "@/features/connect/ConnectFeedRow";
import { HighlightConsentPrompt } from "@/features/connect/HighlightConsentPrompt";
import { ConnectHighlight } from "@/features/connect/ConnectHighlight";
import { getConnectHighlights } from "@/features/connect/connectHighlightData";
import { coFounderBridgeHref } from "@/features/connect/connectTypes";
import { getConnectAttentionCount } from "@/features/connect/connectPresentation";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { hasProfileRole } from "@/features/profile/profileRoles";
import { CapabilityAreaPicker } from "@/features/capability/CapabilityAreaPicker";
import { getCapabilityVocabulary } from "@/features/capability/capabilityData";
import { generateConnectSuggestions, getOwnConnectSuggestions } from "@/features/connect/connectSuggestionData";
import { saveConnectSearchAction } from "@/features/connect/savedSearchActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

const card = "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,.05)]";
const action = "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold focus-visible:ring-4 focus-visible:ring-amber-200";
const selectField = "min-h-11 w-full rounded-xl border border-[#d8d5ea] bg-white px-3 text-sm font-normal normal-case tracking-normal text-[#33325e]";
const field = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
export default async function ConnectPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [t, locale, rawFilters] = await Promise.all([getTranslations("connect"), getLocale(), searchParams]);
  // Mehrfach gesetzte Felder (die Haekchen) kommen als Liste; ab hier ist alles ein Text,
  // Listen sind kommagetrennt - so bleiben auch die Seitenlinks gueltig.
  const filters: Record<string, string | undefined> = Object.fromEntries(
    Object.entries(rawFilters).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]),
  );
  const selectedKinds = parseFeedKinds(filters.art);
  const selectedWork = parseFeedWork(filters.work);
  // Ist ueberhaupt etwas eingegrenzt? Entscheidet, welcher Leerzustand gilt.
  const isFiltered = ["q", "topic", "location", "work"].some((key) => (filters[key] ?? "").trim().length > 0)
    || selectedKinds.join() !== DEFAULT_FEED_KINDS.join();
  const { client, user } = await requireConnectMember(); const [feed, filterOptions, baseProfile, incomingContacts, unreadMessages, capabilityVocabulary, highlights] = await Promise.all([getConnectFeed(client, filters), getConnectFilterOptions(client), getProfileBasicsRow(client, user.id).catch(() => null), getIncomingPendingConnectContactCount(client, user.id), getUnreadConnectMessageCount(client), getCapabilityVocabulary(client), getConnectHighlights(client, user.id),

    // ERZEUGT WIRD AUCH HIER, nicht nur auf der Vorschlagsseite. Sonst waere
    // die Zahl in "Meine Sachen" fuer jeden null, der die Unterseite noch nie
    // geoeffnet hat - und damit waere der Hinweis genau fuer die nutzlos, die
    // er erreichen soll. Das Wochenbudget von drei gilt unveraendert; ist es
    // aufgebraucht, kehrt der Aufruf nach einer Zaehlung zurueck.
    generateConnectSuggestions(client)]);
  const listings = feed.entries;

  // "Fuer dich": hoechstens die drei neuesten offenen Vorschlaege als Streifen oben. Lesen allein - erzeugt
  // wird oben, weggeklickt wird auf der Vorschlagsseite.
  const suggestionStrip = (await getOwnConnectSuggestions(client).catch(() => [])).slice(0, 3);
  // Wie viele Kriterien gesetzt sind - danach richtet sich, ob die
  // Eingrenzung auf dem Telefon offen oder eingeklappt erscheint.
  const activeFilterCount = [
    selectedKinds.join() !== DEFAULT_FEED_KINDS.join(), (filters.topic ?? "").trim().length > 0,
    (filters.location ?? "").trim().length > 0, selectedWork.length > 0,
  ].filter(Boolean).length;
  const connectAttentionCount = getConnectAttentionCount(incomingContacts, unreadMessages);
  const cofounderHref = coFounderBridgeHref(hasProfileRole(baseProfile?.roles, "founder"));
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,.13),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Orientierung, Discoveryarten, Highlights, Beitrag und Suche. */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.01em] text-slate-950 sm:text-[2rem]">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#5f5e7a]">{t("subtitle")}</p>
        </div>
        {/* Rechts oben steht, was einem selbst gehoert. Aus Connect fuehrte
            vorher kein Weg dorthin - man sah ausschliesslich das, was andere
            gemacht haben. */}
        {connectAttentionCount > 0 ? <Link href="/connect/contacts" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-violet-800 underline underline-offset-4">{t("actions.contacts")}<span aria-label={t("messages.attentionCount", { count: connectAttentionCount })} className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[.68rem] font-bold leading-none text-white">{Math.min(connectAttentionCount, 99)}</span></Link> : null}
      </header>

      {/* Erst die Highlights, dann "Fuer dich" als schmale Zeile: Highlights sind fuer alle
          gleich und sagen, warum sie dastehen; "Fuer dich" ist persoenlich und lebt auf
          der Vorschlagsseite. Beides in einem Kasten, und man hielte einen bezahlten
          Platz fuer eine persoenliche Empfehlung. */}
      <HighlightConsentPrompt client={client} userId={user.id} />
      <ConnectHighlight highlights={highlights} />
      {suggestionStrip.length > 0 ? (
        <section aria-labelledby="connect-for-you" className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#e4e2f0] bg-white px-5 py-3">
          <p className="text-sm text-slate-600"><span id="connect-for-you" className="font-semibold text-slate-950">{t("suggestions.title")}</span> · {t("suggestions.strip", { count: suggestionStrip.length })}</p>
          <Link href="/connect/suggestions" className="inline-flex min-h-11 items-center rounded-xl bg-[#f1f0f7] px-4 text-sm font-semibold text-slate-900 hover:bg-[#e9e7f4]">{t("suggestions.all")}</Link>
        </section>
      ) : null}

      {/* Suche und Einstellen in einer Zeile. Das Suchfeld liegt ausserhalb des
          Formulars und gehoert ueber `form` dazu; "Eintrag erstellen" klappt
          die drei Wege zum Einstellen auf. */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-72">
          <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a88a8]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
          <input
            name="q"
            type="search"
            form="connect-filter"
            defaultValue={filters.q}
            className="min-h-12 w-full rounded-xl border border-[#d8d5ea] bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-[#8a88a8]"
            placeholder={t("filters.search")}
            aria-label={t("filters.search")}
          />
        </div>
        <button form="connect-filter" className="min-h-12 shrink-0 rounded-xl bg-[#f1f0f7] px-5 text-sm font-semibold text-slate-900 hover:bg-[#e9e7f4]">{t("filters.searchButton")}</button>
        <details className="relative">
          <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">{t("post.create")} <span aria-hidden="true">▾</span></summary>
          <div className="absolute right-0 z-20 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-[#e4e2f0] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,.12)]">
            <p className="text-[13px] font-semibold uppercase tracking-[.08em] text-[#5f5e7a]">{t("post.title")}</p>
            <p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{t("post.text")}</p>
            <div className="mt-3 grid gap-2">
              <Link href="/connect/listings/new?direction=seeking" className="inline-flex min-h-11 items-center rounded-xl bg-[#efeafd] px-4 text-sm font-semibold text-[#4a2fb8]">{t("actions.seek")}</Link>
              <Link href="/connect/listings/new?direction=offering" className="inline-flex min-h-11 items-center rounded-xl bg-[#dcf3ef] px-4 text-sm font-semibold text-[#0b5d56]">{t("actions.offer")}</Link>
              <Link href={cofounderHref} className="inline-flex min-h-11 items-center rounded-xl bg-[#f1f0f7] px-4 text-sm font-semibold text-slate-900">{t("actions.cofounder")}</Link>
            </div>
          </div>
        </details>
      </section>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <form id="connect-filter" className="rounded-[22px] border border-[#e4e2f0] bg-white p-5">
            <details className="connect-filter-details" open={activeFilterCount > 0}>
              <summary className="flex min-h-9 cursor-pointer items-center text-[13px] font-semibold uppercase tracking-[.08em] text-[#5f5e7a]">{t("filtersLabel")}{activeFilterCount ? ` (${activeFilterCount})` : ""}</summary>
              <div className="mt-3 grid gap-5">
                <fieldset className="grid gap-1">
                  <legend className="mb-1 text-[13px] font-semibold uppercase tracking-[.08em] text-[#5f5e7a]">{t("feed.art")}</legend>
                  {FEED_KINDS.map((kind) => <label key={kind} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[15px] text-slate-900">
                    <input type="checkbox" name="art" value={kind} defaultChecked={selectedKinds.includes(kind)} className="h-[18px] w-[18px] shrink-0 rounded-[5px] border-2 border-[#b9b6d6] accent-[#6d49e0]" />
                    {t(`feed.artOptions.${kind}`)}
                  </label>)}
                </fieldset>
                <label className="grid gap-1.5 text-[13px] font-semibold uppercase tracking-[.08em] text-[#5f5e7a]">{t("feed.topic")}
                  <select name="topic" defaultValue={filters.topic || ""} className={selectField}><option value="">{t("feed.topicAll")}</option>{filterOptions.topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select>
                </label>
                <label className="grid gap-1.5 text-[13px] font-semibold uppercase tracking-[.08em] text-[#5f5e7a]">{t("feed.place")}
                  <select name="location" defaultValue={filters.location || ""} className={selectField}><option value="">{t("feed.placeAll")}</option>{filterOptions.locations.map((place) => <option key={place} value={place}>{place}</option>)}</select>
                </label>
                <fieldset className="grid gap-1">
                  <legend className="mb-1 text-[13px] font-semibold uppercase tracking-[.08em] text-[#5f5e7a]">{t("feed.work")}</legend>
                  {FEED_WORK.map((mode) => <label key={mode} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[15px] text-slate-900">
                    <input type="checkbox" name="work" value={mode} defaultChecked={selectedWork.includes(mode)} className="h-[18px] w-[18px] shrink-0 rounded-[5px] border-2 border-[#b9b6d6] accent-[#6d49e0]" />
                    {t(`feed.workOptions.${mode}`)}
                  </label>)}
                  <p className="text-xs text-[#5f5e7a]">{t("feed.workHint")}</p>
                </fieldset>
              </div>
            </details>
            {/* Zuruecksetzen nur, wenn es etwas zurueckzusetzen gibt. */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="min-h-11 rounded-xl bg-[#f1f0f7] px-5 text-sm font-semibold text-slate-900 hover:bg-[#e9e7f4]">{t("filters.apply")}</button>
              {isFiltered ? <Link href="/connect" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline">{t("empty.reset")}</Link> : null}
            </div>
          </form>
        <div className="rounded-[22px] border border-[#e4e2f0] bg-white/70 p-5">
        {/* AUCH EINGEKLAPPT, seit dem 21.09.2026: Dieser Block war der Rest der
            grossen Filterflaeche - mit der Faehigkeiten-Auswahl darin war er
            grosser als die eingeklappten Filter darueber. Speichern ist der
            zweite Schritt nach dem Eingrenzen, nicht der erste beim Ansehen. */}
        <details>
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">{t("rememberSearch")}</summary>
        <form action={saveConnectSearchAction} className="mt-3">
          <input type="hidden" name="q" value={filters.q ?? ""} />
          <input type="hidden" name="direction" value={selectedKinds.includes("seeking") && !selectedKinds.includes("offering") ? "seeking" : selectedKinds.includes("offering") && !selectedKinds.includes("seeking") ? "offering" : ""} />
          <input type="hidden" name="category" value="" />
          <input type="hidden" name="geographic_scope" value="" />
          <input type="hidden" name="remote_mode" value="" />
          <input type="hidden" name="topics" value={filters.topic ?? ""} />
          <input type="hidden" name="industries" value={filters.industry ?? ""} />
          {/* Das Feld zaehlt, sobald es da ist - deshalb nur rendern, wenn die Art gewaehlt ist. */}
          {selectedKinds.includes("seeking") || selectedKinds.includes("offering") ? <input type="hidden" name="include_listings" value="1" /> : null}
          {selectedKinds.includes("problem") ? <input type="hidden" name="include_problems" value="1" /> : null}
          <p className="text-xs leading-5 text-slate-500">{t("searches.saveText")}</p>
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
        </details>
        </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-[#5f5e7a]">{feed.hasMore ? t("feed.resultMore", { count: listings.length }) : t("feed.result", { count: listings.length })}</p>
      {listings.length ? <section aria-label={t("browseTitle")} className="divide-y divide-[#e4e2f0] overflow-hidden rounded-[22px] border border-[#e4e2f0] bg-white">{listings.map((entry) => <ConnectFeedRow key={entry.key} entry={entry} t={t} locale={locale} />)}</section> : <section className={`${card} text-center`}>
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
          {/* Dazugekommen am 21.09.2026: Wer noch keine Anzeige hat, hat
              vielleicht ein Unternehmen - und eine leere Flaeche, die nur nach
              Anzeigen fragt, sieht aus wie eine Pinnwand. */}
          <Link href="/connect/ventures/mine" className={`${action} border border-slate-200`}>{t("empty.createVenture")}</Link>
        </div>
      </section>}
        </div>
      </div>
    </div>
  <ConnectPagination path="/connect" filters={filters} count={feed.hasMore ? CONNECT_PAGE_SIZE + 1 : listings.length} />
</main>;
}
