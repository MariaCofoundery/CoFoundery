"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { WorkspaceIcon } from "@/features/navigation/workspace/WorkspaceIcon";
import {
  QUICK_CREATE,
  buildWorkspaceNav,
  flattenWorkspaceNav,
  type WorkspaceItemKey,
  type WorkspaceNavItem,
} from "@/features/navigation/workspace/workspaceNav";

type Slots = {
  /** Bild mit Menue (Profil, Konto, Abmelden). */
  profile: React.ReactNode;
  language: React.ReactNode;
  /** Wechsel Founder/Advisor - nur bei beiden Rollen gefuellt. */
  viewSwitch: React.ReactNode;
  feedback: React.ReactNode;
  /** Unter "Mehr" auf dem Handy: Postfach, Profil, Konto, Admin, Feedback, Abmelden, Sprache, Wechsel. */
  moreExtras: React.ReactNode;
};

const COUNT = "inline-flex min-w-5 items-center justify-center rounded-full bg-[#6d49e0] px-1.5 py-0.5 text-[.68rem] font-bold leading-none text-white";

function Count({ value, label }: { value: number; label: string }) {
  if (value <= 0) return null;
  return (
    <span aria-label={label} className={COUNT}>
      {Math.min(value, 99)}
    </span>
  );
}

/**
 * Der Arbeitsbereich fuer die Advisor-Ansicht (Entwurf vom 05.11.2026): links eine Seitenleiste mit allen Stationen,
 * oben eine schlanke Leiste mit Organisation, Suche, "+ Neu", Nachrichten und Profil. Auf dem Handy statt der
 * Seitenleiste fuenf Reiter unten und "Mehr". Reine Darstellung - jede Seite prueft ihren Zugang selbst.
 */
export function WorkspaceChrome({
  children,
  hasOrg,
  orgLabel,
  chatUnread,
  messagesCount,
  slots,
}: {
  children: React.ReactNode;
  hasOrg: boolean;
  orgLabel: string;
  chatUnread: number;
  messagesCount: number;
  slots: Slots;
}) {
  const t = useTranslations("navigation");
  const tw = useTranslations("navigation.workspace");
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  const nav = useMemo(() => buildWorkspaceNav({ hasOrg, chatUnread }), [hasOrg, chatUnread]);
  const all = useMemo(() => flattenWorkspaceNav(nav), [nav]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const createRef = useRef<HTMLDivElement | null>(null);

  // Nach jedem Wechsel des Ortes alles zu - sonst verdeckt ein offenes Panel die Seite, auf der man ankam.
  useEffect(() => {
    setMoreOpen(false);
    setCreateOpen(false);
    setSearchOpen(false);
  }, [pathname, tab]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      } else if (event.key === "Escape") {
        setMoreOpen(false);
        setCreateOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    const onDown = (event: PointerEvent) => {
      if (createRef.current && !createRef.current.contains(event.target as Node)) setCreateOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [createOpen]);

  const isActive = (item: WorkspaceNavItem) => item.match(pathname, tab);
  const label = (key: WorkspaceItemKey) => tw(`items.${key}`);
  const badgeLabel = (item: WorkspaceNavItem) => (item.key === "chat" ? t("teamraumChatCount", { count: item.badge ?? 0 }) : "");

  const sideLink = (item: WorkspaceNavItem) => {
    const active = isActive(item);
    return (
      <div className="flex flex-col gap-0.5">
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-[42px] items-center gap-3 rounded-[10px] px-3 text-[14.5px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9A6FF] ${
            active ? "bg-white/[0.11] font-semibold text-white" : "font-medium text-[#C8CAE8] hover:bg-white/[0.07] hover:text-white"
          }`}
        >
          <WorkspaceIcon name={item.icon} className={active ? "text-[#B9A6FF]" : undefined} />
          <span className="min-w-0 flex-1 truncate">{label(item.key)}</span>
          {item.badge ? <Count value={item.badge} label={badgeLabel(item)} /> : null}
        </Link>
        {active && item.children ? (
          <div className="ml-[30px] flex flex-col gap-0.5 border-l border-white/10 pl-3">
            {item.children.map((child) => (
              <Link
                key={child.key}
                href={child.href}
                aria-current={child.match(pathname) ? "page" : undefined}
                className={`flex min-h-10 items-center rounded-lg px-2.5 text-[13.5px] ${child.match(pathname) ? "font-semibold text-white" : "text-[#C8CAE8] hover:text-white"}`}
              >
                {tw(`children.${child.key}`)}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const phoneTabs = hasOrg
    ? all.filter((item) => ["home", "tasks", "calendar", "chat"].includes(item.key))
    : all.filter((item) => ["home", "follow", "events"].includes(item.key));

  const searchEntries = [
    ...all.map((item) => ({ key: `s-${item.key}`, group: "stations" as const, label: label(item.key), href: item.href })),
    ...(hasOrg ? QUICK_CREATE.map((entry) => ({ key: `c-${entry.key}`, group: "actions" as const, label: tw(`create.${entry.key}.label`), href: entry.href, hint: tw(`create.${entry.key}.hint`) })) : []),
  ];

  return (
    <div className="work-ui min-h-screen bg-[#F4F5FB] lg:flex">
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950">
        {tw("skip")}
      </a>

      <aside aria-label={tw("navLabel")} className="hidden bg-[#17173A] print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[248px] lg:shrink-0 lg:flex-col lg:overflow-y-auto">
        <Link href="/advisor/dashboard" aria-label={t("logoLabel")} className="flex h-16 shrink-0 items-center px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9A6FF]">
          <BrandLogo tone="onDark" className="h-8" priority sizes="144px" />
        </Link>
        <nav aria-label={tw("navLabel")} className="flex flex-1 flex-col gap-0.5 px-3 pb-5 pt-1">
          {sideLink(nav.home)}
          {nav.groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-0.5">
              <p className="mx-3 mb-1.5 mt-[18px] text-[11px] font-semibold uppercase tracking-[0.09em] text-[#9A9DC4]">{tw(`groups.${group.key}`)}</p>
              {group.items.map((item) => (
                <div key={item.key}>{sideLink(item)}</div>
              ))}
            </div>
          ))}
          <span className="min-h-5 flex-1" />
          {nav.setup ? sideLink(nav.setup) : null}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex min-h-16 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 print:hidden sm:gap-3 sm:px-5 lg:px-6">
          <Link href="/advisor/dashboard" aria-label={t("logoLabel")} className="mr-1 shrink-0 lg:hidden">
            <BrandLogo className="h-7" priority sizes="112px" />
          </Link>
          {hasOrg ? (
            <Link
              href="/advisor/organisation"
              title={tw("org")}
              className="inline-flex min-h-11 min-w-0 max-w-[40%] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-semibold text-slate-950 hover:bg-slate-50 sm:max-w-[16rem]"
            >
              <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-violet-100 text-xs font-bold text-violet-800">
                {orgLabel.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 truncate">{orgLabel}</span>
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={tw("search.open")}
            className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-2 hidden min-h-11 max-w-[28rem] flex-1 items-center gap-2.5 rounded-xl bg-[#F4F5FB] px-3.5 text-left text-[14.5px] text-slate-600 hover:bg-slate-100 md:flex"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span className="min-w-0 flex-1 truncate">{tw("search.placeholder")}</span>
            <kbd className="rounded-md border border-slate-300 px-1.5 text-xs font-semibold text-slate-600">⌘K</kbd>
          </button>
          <span className="hidden flex-1 md:block" />

          {hasOrg ? (
            <div ref={createRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCreateOpen((open) => !open)}
                aria-expanded={createOpen}
                aria-haspopup="menu"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#6D49E0] px-3.5 text-[14.5px] font-semibold text-white hover:bg-[#5B36D6] sm:px-[18px]"
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                <span className="hidden sm:inline">{tw("create.button")}</span>
                <span className="sr-only sm:hidden">{tw("create.button")}</span>
              </button>
              {createOpen ? (
                <div role="menu" aria-label={tw("create.menuLabel")} className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(23,23,58,0.16)]">
                  <p className="mx-2.5 mb-1.5 mt-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">{tw("create.title")}</p>
                  {QUICK_CREATE.map((entry) => (
                    <Link key={entry.key} href={entry.href} role="menuitem" className="flex min-h-12 items-center gap-3 rounded-[10px] px-2.5 hover:bg-slate-50">
                      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-violet-100 text-[13px] font-bold text-violet-800">{tw(`create.${entry.key}.label`).slice(0, 1)}</span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[14.5px] font-semibold text-slate-950">{tw(`create.${entry.key}.label`)}</span>
                        <span className="text-[12.5px] text-slate-600">{tw(`create.${entry.key}.hint`)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <Link
            href="/messages"
            aria-label={`${tw("notifications")}${messagesCount > 0 ? ` (${messagesCount})` : ""}`}
            title={tw("notifications")}
            className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 ${pathname.startsWith("/messages") ? "bg-slate-100" : ""}`}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></svg>
            {messagesCount > 0 ? <span aria-hidden="true" className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" /> : null}
          </Link>
          <div className="hidden items-center gap-2 lg:flex">
            {slots.feedback}
            {slots.viewSwitch}
            {slots.language}
            {slots.profile}
          </div>
        </header>

        <div id="workspace-content" className="min-w-0 flex-1 pb-24 lg:pb-0">
          {children}
        </div>
      </div>

      <nav aria-label={tw("tabsLabel")} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] print:hidden lg:hidden" style={{ gridTemplateColumns: `repeat(${phoneTabs.length + 1}, minmax(0, 1fr))` }}>
        {phoneTabs.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[11.5px] ${active ? "font-bold text-[#5B36D6]" : "font-semibold text-slate-700"}`}
            >
              <WorkspaceIcon name={item.icon} size={22} />
              {label(item.key)}
              {item.badge ? <span aria-label={badgeLabel(item)} className="absolute right-[calc(50%-1.6rem)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#6d49e0]" /> : null}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className="flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[11.5px] font-semibold text-slate-700"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          {tw("more")}
        </button>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={tw("moreClose")} onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-[#14152B]/45" />
          <div role="dialog" aria-modal="true" aria-label={tw("more")} className="absolute inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden rounded-t-[26px] bg-white">
            <div className="flex items-center justify-between px-5 pb-1 pt-3">
              <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-8">
              <nav aria-label={tw("navLabel")} className="flex flex-col gap-0.5">
                {[nav.home, ...nav.groups.flatMap((group) => group.items), ...(nav.setup ? [nav.setup] : [])].map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] ${active ? "bg-violet-50 font-semibold text-violet-900" : "font-medium text-slate-900 hover:bg-slate-50"}`}
                    >
                      <WorkspaceIcon name={item.icon} size={20} />
                      <span className="flex-1">{label(item.key)}</span>
                      {item.badge ? <Count value={item.badge} label={badgeLabel(item)} /> : null}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3">{slots.moreExtras}</div>
            </div>
          </div>
        </div>
      ) : null}

      {searchOpen ? <Palette entries={searchEntries} onClose={() => setSearchOpen(false)} /> : null}
    </div>
  );
}

/** Suche ueber die Bereiche und das, was man anlegen kann (⌘K). Keine Inhalte - das steht im Hinweis. */
function Palette({ entries, onClose }: { entries: { key: string; group: "stations" | "actions"; label: string; href: string; hint?: string }[]; onClose: () => void }) {
  const tw = useTranslations("navigation.workspace");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const needle = query.trim().toLowerCase();
  const hits = entries.filter((entry) => !needle || entry.label.toLowerCase().includes(needle) || (entry.hint ?? "").toLowerCase().includes(needle));
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[12vh] print:hidden">
      <button type="button" aria-label={tw("search.close")} onClick={onClose} className="absolute inset-0 bg-[#14152B]/45" />
      <div role="dialog" aria-modal="true" aria-label={tw("search.label")} className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(20,21,43,0.3)]">
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, hits.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && hits[active]) {
              event.preventDefault();
              go(hits[active].href);
            }
          }}
          placeholder={tw("search.placeholder")}
          aria-label={tw("search.label")}
          className="min-h-14 w-full border-0 border-b border-slate-200 px-5 text-[16px] text-slate-950 outline-none"
        />
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {hits.length === 0 ? <li className="px-3 py-4 text-[14.5px] text-slate-700">{tw("search.none")}</li> : null}
          {hits.map((entry, index) => (
            <li key={entry.key}>
              <button
                type="button"
                onClick={() => go(entry.href)}
                onMouseEnter={() => setActive(index)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] ${index === active ? "bg-violet-50 text-violet-950" : "text-slate-900"}`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{entry.label}</span>
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">{tw(`search.${entry.group}`)}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-slate-100 px-5 py-2.5 text-[12.5px] text-slate-600">{tw("search.hint")}</p>
      </div>
    </div>
  );
}
