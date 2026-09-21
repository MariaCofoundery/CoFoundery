import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { TEAM_AREA_STATES } from "@/features/capability/capabilityTeamReadout";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const DATA = "src/features/capability/capabilityTeamData.ts";
const VIEW = "src/features/capability/CapabilityTeamReadoutView.tsx";
const PAGE = "src/app/(product)/teams/[teamId]/roles/page.tsx";

const teamCopy = (locale: string) =>
  (
    JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
      team: Record<string, string> & {
        states: Record<string, { label: string; text: string }>;
      };
    }
  ).team;

/**
 * Die Seite mit der Rollenlage.
 *
 * Die Logik dahinter prueft `capabilityTeamReadout.test.ts` mit 14 Faellen, die
 * Freigabe `supabase/tests/capability_disclosure_team.sql` mit acht. Hier steht,
 * was die Darstellung verspricht - und was sie nicht behaupten darf.
 */

test("die Freigabeleiter wird nicht umgangen", () => {
  // Es gibt genau einen Weg an die Angaben anderer Menschen: die Funktion, die
  // selbst entscheidet, was sie herausgibt. Eine direkte Abfrage auf
  // `person_capability_entries` fuer eine fremde Kennung waere der Weg daneben -
  // und Zeilensicherheit hin oder her, sie waere die Stelle, an der jemand sie
  // eines Tages weitet.
  const data = codeOnly(DATA);
  assert.match(data, /rpc\("get_disclosed_capability"/);
  assert.match(data, /p_context: "team"/);
  assert.doesNotMatch(
    data,
    /from\("person_capability_entries"\)/,
    "die Seite liest Eintraege direkt"
  );
  // Die eigenen Angaben kommen vollstaendig - sich selbst muss man nichts
  // freigeben.
  assert.match(data, /userId === currentUserId/);
  assert.match(data, /getOwnCapabilityEntries/);
});

test("die Seite sagt zuerst, worauf sie beruht", () => {
  // EINE DUENNE KARTE LIEST SICH SONST WIE EIN BEFUND UEBER DAS TEAM, obwohl
  // sie eine Auskunft ueber Einstellungen ist. Deshalb steht die Zahl der
  // Freigaben oben und nicht in einer Fussnote.
  const view = source(VIEW);
  const basisAt = view.indexOf('t("team.basis"');
  const mapAt = view.indexOf('t("team.mapTitle")');
  assert.ok(basisAt > 0 && mapAt > 0 && basisAt < mapAt, "die Grundlage steht nach der Karte");

  // Und sie zaehlt beides: wer ueberhaupt etwas eingetragen hat, und wer die
  // Tiefe freigegeben hat. Nur das zweite laesst eine Rollenaussage zu.
  assert.match(codeOnly(DATA), /withDepth/);
  assert.match(codeOnly(DATA), /entry\.applicationLevel !== null/);
  for (const locale of ["de", "en"]) {
    const basis = teamCopy(locale).basis;
    assert.match(basis, /\{contributing\}/, `${locale}: die Zahl der Beitragenden fehlt`);
    assert.match(basis, /\{withDepth\}/, `${locale}: die Zahl der Freigaben fehlt`);
    assert.match(basis, /\{members\}/, `${locale}: die Teamgroesse fehlt`);
  }
});

test("kein Netzdiagramm, keine Prozente, keine Note", () => {
  // Ein Spinnennetz ueber die Familien behauptet eine Zahl je Familie - also
  // einen Score. Genau den gibt dieses Modell nicht her, und ein Bild, das mehr
  // behauptet als die Daten, ist die unehrlichste Stelle einer Auswertung.
  const view = codeOnly(VIEW);
  assert.doesNotMatch(view, /radar|spider|%|percent|score/i, "die Darstellung rechnet");

  // Gezeigt werden Zaehlwerte ueber Bereiche.
  assert.match(view, /family\.counts\[state\]/);
  for (const locale of ["de", "en"]) {
    assert.match(teamCopy(locale).countEntry, /\{count\}/, `${locale}: keine Zahl im Zaehltext`);
  }
});

test("der Balken ist Schmuck, die Auskunft steht als Text daneben", () => {
  // Wer mit einem Screenreader liest oder Farben nicht unterscheidet, darf
  // nichts verlieren. Deshalb ist die Farbfläche ausgeblendet und dieselbe
  // Aussage steht in Worten.
  const view = source(VIEW);
  assert.match(view, /<div aria-hidden className="flex h-2 gap-0\.5/);
  // Jedes Feld traegt ausserdem seinen Namen und Zustand als title.
  assert.match(view, /title=\{`\$\{areaLabel\(area\.areaId\)\}: \$\{t\(`team\.states\.\$\{area\.state\}\.label`\)\}`\}/);
  // Und die Legende nennt alle Zustaende.
  assert.match(view, /TEAM_AREA_STATES\.map\(\(state\) => \(/);
});

test("worüber niemand gesprochen hat, wird nicht wie eine Lücke gezeichnet", () => {
  // DIE WICHTIGSTE ZELLE DER KARTE: Bei 47 Bereichen und einer Handvoll
  // Eintraegen je Person ist sie am Anfang der Normalfall. Ein grauer Balken
  // saehe aus wie ein Messergebnis, und es gibt keines.
  const view = codeOnly(VIEW);
  assert.match(view, /isUnspoken = family\.state === "unspoken"/);
  assert.match(view, /isUnspoken \?/);
  assert.match(view, /team\.familyUnspoken/);

  for (const locale of ["de", "en"]) {
    const text = teamCopy(locale).familyUnspoken;
    assert.ok(text, `${locale}: der Satz fehlt`);
    // Er muss ausdruecklich sagen, dass es NICHT "fehlt" heisst.
    assert.match(
      text,
      locale === "de" ? /nicht, dass es fehlt/ : /does not mean it is missing/,
      `${locale}: der Satz laesst es wie eine Luecke klingen`
    );
  }
});

test("rot ist nur der Zustand, der eine Entscheidung erzwingt", () => {
  // Wenn alles Unangenehme rot ist, bedeutet Rot nichts mehr. `gap` ist der
  // einzige Zustand, bei dem niemand will UND niemand kann - erst das erzwingt
  // Einstellen, Beauftragen oder ein ausdrueckliches Lassen.
  const view = source(VIEW);
  const colors = view.slice(view.indexOf("const STATE_COLOR"), view.indexOf("const ACTIONABLE"));
  const rose = [...colors.matchAll(/(\w+): "bg-rose-\d+"/g)].map((match) => match[1]);
  assert.deepEqual(rose, ["gap"], "rot steht auch an anderen Zustaenden");

  // Und jeder Zustand hat eine Farbe - sonst bleibt ein Feld unsichtbar.
  for (const state of TEAM_AREA_STATES) {
    assert.match(colors, new RegExp(`${state}: "bg-`), `${state} hat keine Farbe`);
  }
});

test("Aussagen stehen mit Namen da", () => {
  // "Jemand will das verantworten" ist unbrauchbar: Das Gespraech darueber
  // fuehrt man mit Namen.
  const view = codeOnly(VIEW);
  assert.match(view, /team\.wants/);
  assert.match(view, /team\.canDo/);
  assert.match(view, /claimants\.map\(nameOf\)/);

  // Und wenn ein Name fehlt, wird keiner erfunden.
  assert.match(view, /t\("team\.unnamedMember"\)/);
  assert.match(codeOnly(DATA), /names\.get\(userId\)\?\.trim\(\) \|\| ""/);
  for (const locale of ["de", "en"]) {
    assert.ok(teamCopy(locale).unnamedMember, `${locale}: der Rueckfall fehlt`);
  }
});

test("jeder Zustand hat eine Beschriftung und eine Erklaerung, in beiden Sprachen", () => {
  // Die Farbe zeigt die Lage; der Satz sagt, was sie bedeutet und was man tun
  // kann. Ein Bild ohne den Satz waere eine Behauptung ohne Begruendung.
  for (const locale of ["de", "en"]) {
    const states = teamCopy(locale).states;
    for (const state of TEAM_AREA_STATES) {
      assert.ok(states[state]?.label, `${locale}: team.states.${state}.label fehlt`);
      assert.ok(states[state]?.text, `${locale}: team.states.${state}.text fehlt`);
      assert.ok(
        states[state].text.length > 60,
        `${locale}: die Erklaerung zu ${state} sagt zu wenig`
      );
    }
  }

  // Und die Beschriftungen sind Rollenaussagen, keine Urteile ueber Menschen.
  const de = teamCopy("de").states;
  assert.doesNotMatch(
    Object.values(de).map((state) => `${state.label} ${state.text}`).join(" "),
    /schwach|schlecht|Defizit|unfähig|Mangel an/i,
    "eine Beschriftung urteilt ueber Menschen"
  );
});

test("der leere Zustand nennt beide Ursachen und beide Wege", () => {
  // Nichts zu sehen hat genau zwei Gruende - noch keine Angaben, oder die
  // Freigabestufe. Nur einen zu nennen laesst die Haelfte der Menschen im
  // falschen Menue suchen.
  const page = source(PAGE);
  assert.match(page, /data\.contributing === 0/);
  assert.match(page, /href="\/profile\/interview"/);
  assert.match(page, /href="\/profile#freigabe"/);
  for (const locale of ["de", "en"]) {
    const copy = teamCopy(locale);
    assert.ok(copy.emptyTitle && copy.emptyText, `${locale}: der leere Zustand fehlt`);
    assert.ok(copy.emptyInterview && copy.emptyDisclosure, `${locale}: ein Weg fehlt`);
    // Und er sagt, dass "privat" privat bleibt - sonst liest sich die
    // Aufforderung wie ein Zwang.
    assert.match(
      copy.emptyText,
      locale === "de" ? /privat/ : /private/,
      `${locale}: der leere Zustand verschweigt die Wahl`
    );
  }
});

test("die Seite ist nur fuer Mitglieder des Teams", () => {
  const page = source(PAGE);
  assert.match(page, /redirect\(`\/login\?next=\$\{encodeURIComponent\(pathname\)\}`\)/);
  // `getFounderTeamHomebase` gibt null zurueck, wenn man nicht dabei ist.
  assert.match(page, /if \(!team\) notFound\(\)/);
});

test("der Reiter steht in der Team-Navigation", () => {
  // Eine Seite, die niemand findet, ist keine.
  const nav = source("src/features/teams/FounderTeamNavigation.tsx");
  assert.match(nav, /key: "roles" as const, href: `\/teams\/\$\{encodeURIComponent\(teamId\)\}\/roles`/);

  for (const locale of ["de", "en"]) {
    const navigation = (
      JSON.parse(readFileSync(`messages/${locale}/teams.json`, "utf8")) as {
        teamNavigation: Record<string, string>;
      }
    ).teamNavigation;
    assert.ok(navigation.roles, `${locale}: teamNavigation.roles fehlt`);
  }
});

test("die Erzaehlung verlaesst die eigene Seite nicht", () => {
  // GEFRAGT AM 21.09.2026: "Die eingesprochenen Texte sollen nie anderen
  // gezeigt werden." Sie wurden es nie - drei pgTAP-Faelle in
  // capability_disclosure_team.sql halten es an der Datenbank fest, auch fuer
  // den guenstigsten Fall (dieselbe Person, dasselbe Team, hoechste
  // Freigabestufe). Hier steht die Code-Seite.
  //
  // GENAU EINE STELLE liest Erzaehlungen, und die holt die eigenen. Kommt eine
  // zweite dazu, faellt sie hier auf.
  const readers = ["src/features/capability/capabilityData.ts"];
  const dir = "src/features/capability";
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
    const path = `${dir}/${file}`;
    const code = codeOnly(path);
    if (!/narrative/.test(code)) continue;
    // Schreiben ist erlaubt, lesen nur an der einen Stelle.
    const reads = /select\([^)]*narrative/.test(code);
    if (reads) {
      assert.ok(readers.includes(path), `${path} liest Erzaehlungen - das war nicht vorgesehen`);
    }
  }

  // Und die Teamauswertung nimmt fuer FREMDE Menschen ausschliesslich die
  // freigegebene Sicht, die den Text nicht enthaelt. Die eigene Abfrage steht
  // ausdruecklich unter der Bedingung, dass es die eigene Kennung ist.
  const data = codeOnly(DATA);
  const ownBranch = data.indexOf("userId === currentUserId");
  // Die AUFRUFSTELLE, nicht den Namen: Der Import steht ganz oben.
  const ownCall = data.indexOf("getOwnCapabilityEntries(client");
  assert.ok(ownBranch > 0 && ownCall > ownBranch, "die eigene Abfrage steht nicht unter der Bedingung");
  assert.doesNotMatch(data, /narrative/, "die Teamauswertung nennt die Erzaehlung");

  // Auch die Ansicht nicht.
  assert.doesNotMatch(codeOnly(VIEW), /narrative/);
});
