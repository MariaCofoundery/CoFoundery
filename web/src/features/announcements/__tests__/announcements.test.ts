import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { announcementTeaser, displayOf, isSafeCtaHref, parseAnnouncementForm } from "@/features/announcements/announcementModel";

const code = (path: string) =>
  readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const base = { title_de: "Neu", body_de: "Text" };

test("Knopfziele: nur Pfade in der App und https", () => {
  for (const ok of ["/", "/connect", "/profile?step=identity", "https://made2found.de/x"]) assert.equal(isSafeCtaHref(ok), true, ok);
  for (const bad of ["", "javascript:alert(1)", "//fremd.example", "http://unsicher.example", "data:text/html,x", "/a b", "/a\\b", "mailto:x@y.de", "ftp://x"]) {
    assert.equal(isSafeCtaHref(bad), false, bad);
  }
});

test("das Formular: Pflichtfelder, Englisch nur zusammen, Knopf nur mit Beschriftung und Ziel", () => {
  assert.equal(parseAnnouncementForm(form({ ...base })).ok, true);
  assert.equal(parseAnnouncementForm(form({ title_de: "", body_de: "x" })).ok, false);
  assert.equal(parseAnnouncementForm(form({ ...base, title_en: "New" })).ok, false);
  assert.equal(parseAnnouncementForm(form({ ...base, title_en: "New", body_en: "Text" })).ok, true);
  assert.equal(parseAnnouncementForm(form({ ...base, cta_href: "/connect" })).ok, false);
  assert.equal(parseAnnouncementForm(form({ ...base, cta_label_de: "Los" })).ok, false);
  assert.equal(parseAnnouncementForm(form({ ...base, cta_label_de: "Los", cta_href: "/connect" })).ok, true);
  assert.equal(parseAnnouncementForm(form({ ...base, cta_label_de: "Los", cta_href: "javascript:x" })).ok, false);
  assert.equal(parseAnnouncementForm(form({ ...base, cta_label_en: "Go" })).ok, false);
});

test("Zeitraum und Einmaligkeit", () => {
  const ok = parseAnnouncementForm(form({ ...base, starts_on: "2026-11-01", ends_on: "2026-11-30", show_once: "yes" }));
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.value.showOnce, true);
    assert.equal(ok.value.startsAt, "2026-11-01T00:00:00.000Z");
    assert.equal(ok.value.endsAt, "2026-11-30T23:59:59.000Z");
  }
  // Ohne Haken: wiederkehrend.
  const repeat = parseAnnouncementForm(form({ ...base }));
  assert.ok(repeat.ok && repeat.value.showOnce === false);
  assert.equal(parseAnnouncementForm(form({ ...base, starts_on: "2026-12-01", ends_on: "2026-11-01" })).ok, false);
  assert.equal(parseAnnouncementForm(form({ ...base, starts_on: "kein datum" })).ok, false);
  // Längen werden gekappt, nicht abgewiesen.
  const long = parseAnnouncementForm(form({ title_de: "t".repeat(500), body_de: "b".repeat(5000) }));
  assert.ok(long.ok && long.value.titleDe.length === 120 && long.value.bodyDe.length === 1500);
});

test("Verwalten nur mit Admin-Recht, Abholen nur mit Anmeldung", () => {
  const actions = code("src/features/announcements/announcementActions.ts");
  const save = actions.slice(actions.indexOf("export async function saveAnnouncementAction"), actions.indexOf("export async function setAnnouncementStatusAction"));
  assert.match(save, /requirePlatformAdmin\(\)/);
  const status = actions.slice(actions.indexOf("export async function setAnnouncementStatusAction"), actions.indexOf("export async function getPendingAnnouncementAction"));
  assert.match(status, /requirePlatformAdmin\(\)/);
  assert.match(actions, /getRequestUser\(\)/);
  const page = code("src/app/(product)/admin/announcements/page.tsx");
  assert.match(page, /requirePlatformAdmin\(\)/);
});

test("das Pop-up wartet auf ein freies Fenster, bevor es abholt, und Wegklicken heißt gelesen", () => {
  const popup = code("src/features/announcements/AnnouncementPopup.tsx");
  // Der Abruf vermerkt "gesehen": Er darf erst kommen, wenn kein anderer Dialog offen ist.
  assert.ok(popup.indexOf("anotherDialogIsOpen()") < popup.indexOf("getPendingAnnouncementAction()"));
  assert.match(popup, /event\.key !== "Escape"/);
  assert.match(popup, /dismissAnnouncementAction\(current\.id\)/);
  // Das äußere Feld der Karte scrollt, damit auf kleinen Bildschirmen nichts abgeschnitten ist.
  const view = code("src/features/announcements/AnnouncementView.tsx");
  assert.match(view, /role="dialog"/);
  assert.match(view, /overflow-y-auto/);
  // Text wird als Text gesetzt, nie als Markup.
  assert.doesNotMatch(code("src/features/announcements/AnnouncementCard.tsx"), /dangerouslySetInnerHTML/);
});

test("die Tabellen sind zu; alles läuft über Funktionen, Admin-Funktionen prüfen selbst", () => {
  const sql = readFileSync("../supabase/migrations/20270115120000_platform_announcements.sql", "utf8");
  assert.match(sql, /alter table public\.platform_announcements enable row level security/);
  assert.match(sql, /revoke all on public\.platform_announcements from public, anon, authenticated/);
  for (const fn of ["admin_list_announcements", "admin_save_announcement", "admin_set_announcement_status"]) {
    const body = sql.slice(sql.indexOf(`create function public.${fn}`));
    assert.match(body.slice(0, 900), /is_platform_admin\(\)/, `${fn} prüft das Admin-Recht nicht`);
  }
  // Ohne Anmeldung gibt es nichts.
  assert.match(sql, /if v_user is null then\s+return;/);
});

test("das rosa Herz gibt es nur für Admins, mit Neuigkeiten, und es zählt nicht mit", () => {
  const shell = code("src/features/navigation/ProductShell.tsx");
  assert.match(shell, /isPlatformAdmin \? \(\s*<AdminHeart/);
  assert.match(shell, /isMenuOpen && isPlatformAdmin \? \(\s*<AdminHeart/);
  assert.match(shell, /function AdminHeart\([^)]*\)[^{]*\{\s*if \(count < 1\) return null;/);
  assert.match(shell, /fill="#ec4899"/);
});

test("deutsch und englisch haben dieselben Schlüssel", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  for (const file of ["admin", "notices"]) {
    const de = JSON.parse(readFileSync(`messages/de/${file}.json`, "utf8")).announcements;
    const en = JSON.parse(readFileSync(`messages/en/${file}.json`, "utf8")).announcements;
    assert.deepEqual(keys(de).sort(), keys(en).sort(), file);
  }
});

test("drei Darstellungen: Karte ist der Standard, nichts anderes gilt", () => {
  assert.equal(displayOf("banner"), "banner");
  assert.equal(displayOf("toast"), "toast");
  assert.equal(displayOf("popup"), "card");
  assert.equal(displayOf(null), "card");
  const ok = parseAnnouncementForm(form({ ...base, display: "banner" }));
  assert.ok(ok.ok && ok.value.display === "banner");
  const none = parseAnnouncementForm(form({ ...base }));
  assert.ok(none.ok && none.value.display === "card");
  const bad = parseAnnouncementForm(form({ ...base, display: "<script>" }));
  assert.ok(bad.ok && bad.value.display === "card");
});

test("das Band zeigt Titel und ersten Satz; Weiterlesen nur, wenn es mehr gibt", () => {
  const long = announcementTeaser("Erster Satz. Zweiter Satz.\n\nNoch ein Absatz.");
  assert.equal(long.teaser, "Erster Satz.");
  assert.equal(long.hasMore, true);
  const short = announcementTeaser("Nur ein Satz.");
  assert.equal(short.teaser, "Nur ein Satz.");
  assert.equal(short.hasMore, false);
  // Ohne Satzzeichen: der ganze erste Absatz.
  assert.equal(announcementTeaser("Ohne Punkt\n\nZweiter Absatz").teaser, "Ohne Punkt");
});

test("nur die Karte hält die Seite an; Band und Hinweis lassen sie bedienbar", () => {
  const popup = code("src/features/announcements/AnnouncementPopup.tsx");
  assert.match(popup, /item\?\.display === "card"/);
  assert.match(popup, /if \(!item \|\| !modal\) return;/);
  const view = code("src/features/announcements/AnnouncementView.tsx");
  const card = view.slice(view.indexOf("function Card("), view.indexOf("function Banner("));
  const banner = view.slice(view.indexOf("function Banner("), view.indexOf("function Toast("));
  const toast = view.slice(view.indexOf("function Toast("));
  assert.match(card, /aria-modal="true"/);
  assert.doesNotMatch(banner, /role="dialog"|aria-modal/);
  assert.doesNotMatch(toast, /role="dialog"|aria-modal/);
  // Das Abbild im Admin-Bereich und das echte Pop-up sind dieselbe Komponente.
  assert.match(code("src/features/announcements/AnnouncementPreview.tsx"), /<AnnouncementView/);
  assert.match(code("src/features/announcements/AnnouncementPopup.tsx"), /<AnnouncementView/);
  // Text als Text, nie als Markup.
  assert.doesNotMatch(view, /dangerouslySetInnerHTML/);
});

test("die Darstellung liegt in der Datenbank, mit Prüfung, und der Admin-Bereich kann sie wählen", () => {
  const sql = readFileSync("../supabase/migrations/20270401120000_announcement_display.sql", "utf8");
  assert.match(sql, /check \(display in \('card', 'banner', 'toast'\)\)/);
  assert.match(sql, /default 'card'/);
  assert.match(sql, /p_display text default 'card'/);
  const actions = code("src/features/announcements/announcementActions.ts");
  assert.match(actions, /p_display: v\.display/);
  assert.match(code("src/features/announcements/AnnouncementForm.tsx"), /name="display"/);
  const page = code("src/app/(product)/admin/announcements/page.tsx");
  assert.match(page, /<AnnouncementForm/);
});
