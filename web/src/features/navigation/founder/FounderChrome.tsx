"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { FounderIcon } from "@/features/navigation/founder/FounderIcon";
import {
  PHONE_TAB_COUNT,
  applyFounderPrefs,
  splitConnectTabs,
  searchTargets,
  trailOf,
  type FounderNavChild,
  type FounderNavItem,
  type FounderNavPrefs,
} from "@/features/navigation/founder/founderNav";
import { Count, Palette } from "@/features/navigation/workspace/WorkspaceChrome";

type Slots = {
  profile: React.ReactNode;
  language: React.ReactNode;
  /** Wechsel Founder/Advisor - nur bei beiden Rollen gefuellt. */
  viewSwitch: React.ReactNode;
  feedback: React.ReactNode;
  /** Unter "Mehr" auf dem Handy: Postfach, Profil, Konto, Admin, Feedback, Abmelden, Sprache, Wechsel. */
  moreExtras: React.ReactNode;
};

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9A6FF]";

/**
 * Die Seitenleiste fuer die Founder-Ansicht und fuer Konten nur mit Connect (Entwurf vom 08.11.2026, Variante A):
 * links die Bereiche (Start, Align, Find, Connect, Events), der aktive Bereich klappt auf und zeigt seine Unterpunkte;
 * oben eine schlanke Leiste mit Ort, Suche, Nachrichten und Profil. Auf dem Handy vier Reiter unten und "Mehr", die
 * Unterpunkte als Chips unter der Kopfzeile. Bei Connect allein sind die Unterpunkte die Leiste und die Reiter.
 *
 * Reine Darstellung: Die Eintraege kommen aus der Navigation der ProductShell. Jede Seite prueft ihren Zugang selbst.
 */
export function FounderChrome({
  children,
  items,
  connectOnly,
  prefs,
  dashboardHref,
  messagesCount,
  slots,
}: {
  children: React.ReactNode;
  items: FounderNavItem[];
  connectOnly: boolean;
  prefs: FounderNavPrefs | null;
  dashboardHref: string;
  messagesCount: number;
  slots: Slots;
}) {
  const t = useTranslations("navigation");
  const tf = useTranslations("navigation.founder");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Von Hand auf- oder zugeklappt, bis man weitergeht. Ohne Eingriff ist offen, was aktiv ist.
  const [folded, setFolded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMoreOpen(false);
    setSearchOpen(false);
    setFolded({});
  }, [pathname]);

  // Escape schliesst nur, was dieses Geruest selbst offen hat, und sagt es (preventDefault) - siehe WorkspaceChrome.
  const anyOpen = useRef(false);
  anyOpen.current = moreOpen || searchOpen;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      } else if (event.key === "Escape" && anyOpen.current) {
        event.preventDefault();
        setMoreOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Die eigene Leiste (ausgeblendet/sortiert). Suche und Ort kennen immer alle Bereiche.
  const shown = useMemo(() => applyFounderPrefs(items, connectOnly ? null : prefs), [items, prefs, connectOnly]);
  // Connect allein: Die Unterpunkte SIND die Leiste.
  const connectChildren = connectOnly ? (items[0]?.children ?? []) : [];
  const connectSplit = splitConnectTabs(connectChildren);
  const trail = useMemo(() => trailOf(items), [items]);
  const activeArea = items.find((item) => item.active);
  const chips = connectOnly ? [] : (activeArea?.children ?? []);

  const searchEntries = useMemo(
    () => searchTargets(items).map((entry) => ({ key: `s-${entry.key}`, group: "stations" as const, label: entry.label, href: entry.href, hint: entry.parent })),
    [items],
  );

  const badge = (value?: { value: number; label: string }) => (value ? <Count value={value.value} label={value.label} /> : null);

  const childLink = (child: FounderNavChild) => (
    <Link
      key={child.href}
      href={child.href}
      aria-current={child.active ? "page" : undefined}
      className={`flex min-h-9 items-center gap-2 rounded-[9px] px-3 text-[13.5px] ${FOCUS} ${
        child.active ? "bg-[#2E2F62] font-semibold text-white" : "text-[#C8CAE8] hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{child.label}</span>
      {badge(child.count)}
    </Link>
  );

  const areaRow = (item: FounderNavItem) => {
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const open = hasChildren && (folded[item.key] ?? item.active);
    return (
      <div key={item.key} className="flex flex-col gap-0.5">
        <div className="flex items-center gap-0.5">
          <Link
            href={item.href}
            aria-current={item.active && !hasChildren ? "page" : undefined}
            className={`flex min-h-[42px] min-w-0 flex-1 items-center gap-3 rounded-[10px] px-3 text-[14.5px] transition ${FOCUS} ${
              item.active ? "bg-white/[0.11] font-semibold text-white" : "font-medium text-[#C8CAE8] hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <FounderIcon name={item.key} className={item.active ? "text-[#B9A6FF]" : undefined} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {badge(item.badge)}
          </Link>
          {hasChildren ? (
            <button
              type="button"
              aria-expanded={open}
              aria-label={tf("toggle", { name: item.label })}
              onClick={() => setFolded((current) => ({ ...current, [item.key]: !open }))}
              className={`grid h-[42px] w-9 shrink-0 place-items-center rounded-[10px] text-[#9A9DC4] hover:bg-white/[0.07] hover:text-white ${FOCUS}`}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-90" : ""}`}>
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          ) : null}
        </div>
        {open ? <div className="ml-[30px] flex flex-col gap-0.5 border-l border-white/10 pl-3">{item.children?.map(childLink)}</div> : null}
      </div>
    );
  };

  const messagesActive = pathname.startsWith("/messages");
  const messagesBadge = messagesCount > 0 ? { value: messagesCount, label: t("messagesAttentionBadge", { count: messagesCount }) } : undefined;

  // Reiter unten (Handy). Bei Connect allein die ersten Unterpunkte, sonst die ersten Bereiche der Leiste.
  const tabEntries = connectOnly
    ? connectSplit.tabs.map((child) => ({ key: child.href, href: child.href, label: child.label, active: child.active, icon: child.icon ?? "dot", dot: Boolean(child.count?.value) }))
    : shown.slice(0, PHONE_TAB_COUNT).map((item) => ({ key: item.key, href: item.href, label: item.label, active: item.active, icon: item.key as string, dot: Boolean(item.badge?.value) }));
  const moreEntries = connectOnly
    ? connectSplit.more.map((child) => ({ key: child.href, href: child.href, label: child.label, active: child.active, icon: child.icon ?? "dot", count: child.count }))
    : shown.slice(PHONE_TAB_COUNT).map((item) => ({ key: item.key as string, href: item.href, label: item.label, active: item.active, icon: item.key as string, count: item.badge }));
  const moreActive = moreEntries.some((entry) => entry.active) || messagesActive;

  return (
    <div className="work-ui min-h-screen bg-[#F4F5FB] lg:flex">
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950">
        {tf("skip")}
      </a>

      <aside aria-label={tf("navLabel")} className="hidden bg-[#17173A] print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[260px] lg:shrink-0 lg:flex-col lg:overflow-y-auto">
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
          <Link href={dashboardHref} aria-label={t("logoLabel")} className={`rounded-lg ${FOCUS}`}>
            <BrandLogo tone="onDark" className="h-8" priority sizes="144px" />
          </Link>
          <span className="rounded-full border border-[#8E6FF0]/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#B9A6FF]">{t("betaBadge")}</span>
        </div>
        <nav aria-label={tf("navLabel")} className="flex flex-1 flex-col gap-0.5 px-3 pb-4 pt-1">
          {connectOnly ? (
            <>
              <p className="mx-3 mb-1.5 mt-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#9A9DC4]">{t("areaConnect")}</p>
              {connectChildren.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  aria-current={child.active ? "page" : undefined}
                  className={`flex min-h-[42px] items-center gap-3 rounded-[10px] px-3 text-[14.5px] ${FOCUS} ${
                    child.active ? "bg-white/[0.11] font-semibold text-white" : "font-medium text-[#C8CAE8] hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <FounderIcon name={child.icon ?? "dot"} className={child.active ? "text-[#B9A6FF]" : undefined} />
                  <span className="min-w-0 flex-1 truncate">{child.label}</span>
                  {badge(child.count)}
                </Link>
              ))}
            </>
          ) : (
            shown.map(areaRow)
          )}
          <span className="min-h-5 flex-1" />
          <div className="flex flex-col gap-0.5 border-t border-white/10 pt-2.5">
            <Link
              href="/messages"
              aria-current={messagesActive ? "page" : undefined}
              className={`flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] ${FOCUS} ${messagesActive ? "bg-white/[0.11] font-semibold text-white" : "font-medium text-[#C8CAE8] hover:bg-white/[0.07] hover:text-white"}`}
            >
              <FounderIcon name="messages" />
              <span className="min-w-0 flex-1 truncate">{t("messages")}</span>
              {badge(messagesBadge)}
            </Link>
            {connectOnly ? null : (
              <Link href="/me/seitenleiste" className={`flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium text-[#C8CAE8] hover:bg-white/[0.07] hover:text-white ${FOCUS}`}>
                <FounderIcon name="customize" />
                {tf("customize")}
              </Link>
            )}
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white print:hidden">
          <div className="flex min-h-16 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-5 lg:px-6">
            <Link href={dashboardHref} aria-label={t("logoLabel")} className="mr-1 shrink-0 lg:hidden">
              <BrandLogo className="h-7" priority sizes="112px" />
            </Link>
            {trail.length > 0 ? (
              <p aria-label={t("breadcrumbLabel")} className="hidden min-w-0 items-center gap-1.5 truncate text-[14px] text-slate-600 lg:flex">
                {trail.map((part, index) => (
                  <span key={part} className="inline-flex items-center gap-1.5">
                    {index > 0 ? <span aria-hidden="true">›</span> : null}
                    <span className={index === trail.length - 1 ? "font-semibold text-slate-950" : ""}>{part}</span>
                  </span>
                ))}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={tf("search.open")}
              className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="ml-auto hidden min-h-11 w-full max-w-[22rem] items-center gap-2.5 rounded-xl bg-[#F4F5FB] px-3.5 text-left text-[14.5px] text-slate-600 hover:bg-slate-100 md:flex"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <span className="min-w-0 flex-1 truncate">{tf("search.placeholder")}</span>
              <kbd className="rounded-md border border-slate-300 px-1.5 text-xs font-semibold text-slate-600">⌘K</kbd>
            </button>

            <Link
              href="/messages"
              aria-label={`${tf("notifications")}${messagesCount > 0 ? ` (${messagesCount})` : ""}`}
              title={tf("notifications")}
              className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 ${messagesActive ? "bg-slate-100" : ""}`}
            >
              <FounderIcon name="bell" />
              {messagesCount > 0 ? <span aria-hidden="true" className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" /> : null}
            </Link>
            <div className="hidden items-center gap-2 lg:flex">
              {slots.feedback}
              {slots.viewSwitch}
              {slots.language}
              {slots.profile}
            </div>
          </div>

          {chips.length > 0 ? (
            <nav aria-label={tf("subLabel", { name: activeArea?.label ?? "" })} className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] sm:px-5 lg:hidden [&::-webkit-scrollbar]:hidden">
              {chips.map((chip) => (
                <Link
                  key={chip.href}
                  href={chip.href}
                  aria-current={chip.active ? "page" : undefined}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] ${
                    chip.active ? "bg-[#14152B] font-semibold text-white" : "border border-slate-300 bg-white font-medium text-slate-800"
                  }`}
                >
                  {chip.label}
                  {chip.count?.value ? <span aria-label={chip.count.label} className="h-2 w-2 rounded-full bg-[#6d49e0]" /> : null}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>

        <div id="workspace-content" className="min-w-0 flex-1 pb-24 lg:pb-0">
          {children}
        </div>
      </div>

      <nav aria-label={tf("tabsLabel")} className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] print:hidden lg:hidden" style={{ gridTemplateColumns: `repeat(${tabEntries.length + 1}, minmax(0, 1fr))` }}>
        {tabEntries.map((entry) => (
          <Link
            key={entry.key}
            href={entry.href}
            aria-current={entry.active ? "page" : undefined}
            className={`relative flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[11.5px] ${entry.active ? "font-bold text-[#5B36D6]" : "font-semibold text-slate-700"}`}
          >
            <FounderIcon name={entry.icon} size={22} />
            <span className="max-w-full truncate px-0.5">{entry.label}</span>
            {entry.dot ? <span aria-hidden="true" className="absolute right-[calc(50%-1.6rem)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#6d49e0]" /> : null}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`relative flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[11.5px] ${moreActive ? "font-bold text-[#5B36D6]" : "font-semibold text-slate-700"}`}
        >
          <FounderIcon name="more" size={22} />
          {tf("more")}
          {messagesCount > 0 ? <span aria-hidden="true" className="absolute right-[calc(50%-1.4rem)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" /> : null}
        </button>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={tf("moreClose")} onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-[#14152B]/45" />
          <div role="dialog" aria-modal="true" aria-label={tf("more")} className="absolute inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden rounded-t-[26px] bg-white">
            <div className="flex items-center justify-between px-5 pb-1 pt-3">
              <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-8">
              {moreEntries.length > 0 ? (
                <nav aria-label={tf("navLabel")} className="flex flex-col gap-0.5">
                  {moreEntries.map((entry) => (
                    <Link
                      key={entry.key}
                      href={entry.href}
                      aria-current={entry.active ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] ${entry.active ? "bg-violet-50 font-semibold text-violet-900" : "font-medium text-slate-900 hover:bg-slate-50"}`}
                    >
                      <FounderIcon name={entry.icon} />
                      <span className="flex-1">{entry.label}</span>
                      {badge(entry.count)}
                    </Link>
                  ))}
                </nav>
              ) : null}
              <div className={`flex flex-col gap-1 ${moreEntries.length > 0 ? "mt-3 border-t border-slate-200 pt-3" : ""}`}>
                {connectOnly ? null : (
                  <Link href="/me/seitenleiste" className="flex min-h-12 items-center rounded-xl px-3 text-[15px] font-medium text-slate-900 hover:bg-slate-50">
                    {tf("customizeTabs")}
                  </Link>
                )}
                {slots.moreExtras}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {searchOpen ? <Palette ns="navigation.founder" entries={searchEntries} onClose={() => setSearchOpen(false)} /> : null}
    </div>
  );
}
