import test from "node:test";
import assert from "node:assert/strict";
import { chooseChrome, type ChromeInput, type ChromeKind } from "@/features/navigation/chromeChoice";

// Die Tabelle zeigt, wer welches Menue-Geruest sieht. Besonders die Zeilen mit "classic": Wer dort landet, sieht die
// aeltere Kopfleiste. Wird "classic" einmal abgeschafft, sagt dieser Test, wen es trifft.

const NONE = { hasFounder: false, hasAdvisor: false, hasConnect: false, hasConnectAccount: false };

const rows: { name: string; input: Partial<ChromeInput>; path: string; view: "founder" | "advisor"; expect: ChromeKind }[] = [
  // Founder
  { name: "Founder, Dashboard", input: { hasFounder: true }, path: "/dashboard", view: "founder", expect: "founder" },
  { name: "Founder, Team", input: { hasFounder: true }, path: "/teams/abc", view: "founder", expect: "founder" },
  { name: "Founder mit Connect, Connect", input: { hasFounder: true, hasConnect: true }, path: "/connect", view: "founder", expect: "founder" },
  // Reines Connect-Konto
  { name: "nur Connect, Connect", input: { hasConnect: true }, path: "/connect", view: "founder", expect: "founder" },
  { name: "nur Connect, Konto", input: { hasConnect: true }, path: "/account", view: "founder", expect: "founder" },
  // Advisor: Arbeitsbereich hat die Seitenleiste, der Rest die klassische Leiste
  { name: "Advisor, Advisor-Dashboard", input: { hasAdvisor: true }, path: "/advisor/dashboard", view: "advisor", expect: "workspace" },
  { name: "Advisor, Postfach", input: { hasAdvisor: true }, path: "/messages", view: "advisor", expect: "workspace" },
  { name: "Advisor, Konto", input: { hasAdvisor: true }, path: "/account", view: "advisor", expect: "workspace" },
  { name: "Advisor, Events", input: { hasAdvisor: true }, path: "/events", view: "advisor", expect: "workspace" },
  { name: "Advisor, eigenes Profil", input: { hasAdvisor: true }, path: "/me/profile", view: "advisor", expect: "classic" },
  { name: "Advisor, Connect", input: { hasAdvisor: true, hasConnect: true }, path: "/connect", view: "advisor", expect: "classic" },
  { name: "Advisor, Team", input: { hasAdvisor: true }, path: "/teams/abc", view: "advisor", expect: "classic" },
  // Beide Rollen: Der Wechsel entscheidet
  { name: "beide, Advisor-Ansicht, Advisor-Seite", input: { hasFounder: true, hasAdvisor: true }, path: "/advisor/begleitung", view: "advisor", expect: "workspace" },
  { name: "beide, Advisor-Ansicht, Profil", input: { hasFounder: true, hasAdvisor: true }, path: "/me/profile", view: "advisor", expect: "classic" },
  { name: "beide, Founder-Ansicht, Dashboard", input: { hasFounder: true, hasAdvisor: true }, path: "/dashboard", view: "founder", expect: "founder" },
  // Randfall: Advisor ohne Founder in der Founder-Ansicht
  { name: "Advisor in Founder-Ansicht", input: { hasAdvisor: true }, path: "/dashboard", view: "founder", expect: "classic" },
  // Gesperrtes Connect-Konto
  { name: "gesperrt, Konto", input: { hasConnectAccount: true }, path: "/account", view: "founder", expect: "classic" },
  { name: "gesperrt, Connect", input: { hasConnectAccount: true }, path: "/connect", view: "founder", expect: "classic" },
];

for (const row of rows) {
  test(`Geruest: ${row.name} (${row.path}) -> ${row.expect}`, () => {
    assert.equal(chooseChrome({ ...NONE, ...row.input, activeView: row.view, pathname: row.path }), row.expect);
  });
}
