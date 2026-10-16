import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  CONNECT_REASON_POLICY,
  FIND_REASON_POLICY,
  presentConnectReasons,
  presentFindReasons,
  type PresentedMatch,
} from "@/lib/matching/reasonPresentation";
import { matchConnect } from "@/lib/matching/v01/connectMatcher";
import { matchFindPair } from "@/lib/matching/v01/findMatcher";
import { createIdfIndex } from "@/lib/matching/v01/idf";
import { attachWorkstyleContext } from "@/lib/matching/v01/workstyle";
import type { ConnectListingInput, ConnectOfferInput, FindMatchResult } from "@/lib/matching/v01/types";
import { cap, FIND_CTX, person } from "@/lib/matching/v01/__tests__/helpers/builders";
import {
  NOW,
  findPerson,
  listingsById,
  offerInput,
  regression,
  seekInput,
  synthetic,
  syntheticIdfSnapshot,
} from "@/lib/matching/v01/__tests__/helpers/synthetic";

/**
 * Präsentationsschicht: Was eine Person von einem Matching-Ergebnis sehen darf.
 * Die Engine selbst prüfen die Tests unter v01/__tests__ (unverändert).
 */

const read = (path: string) => readFileSync(path, "utf8");
const json = (value: unknown) => JSON.stringify(value);
const INTERNAL_KEYS = /"(score|relevance|components|confidence|evidence|idfCorpusVersion|matchingVersion|normalizationVersion|inputVersions|eligibility|reasons":\[\{"code":"GATE|tieGroup|secondaryOrder|rank|workstyleContext|mustHaves|capCover|roleCover)"/;

function assertUiSafe(out: PresentedMatch) {
  const s = json(out);
  assert.doesNotMatch(s, INTERNAL_KEYS);
  assert.doesNotMatch(s, /GATE_|POOL_|CONNECT_GATE_|%/);
  const leaves = (v: unknown): unknown[] => (v !== null && typeof v === "object" ? Object.values(v).flatMap(leaves) : [v]);
  assert.ok(leaves(out).every((v) => typeof v === "string" || typeof v === "boolean"), "keine Zahlen (Scores, IDF, Rang)");
  for (const r of out.reasons) {
    assert.notEqual(r.visibility, "internal");
    for (const v of Object.values(r.data)) assert.ok(v.length <= 120);
  }
}

// ---------------------------------------------------------------------------
// FIND: private Kriterien
// ---------------------------------------------------------------------------
test("eigener offener Punkt: nur die setzende Person sieht ihn, ohne den gespeicherten Wert", () => {
  const r = matchFindPair(
    person("a", { mustHaves: { desiredLocationRegion: "Leipzig" } }),
    person("b", { locationRegion: null }),
    FIND_CTX,
  );
  assert.equal(r.eligibility.status, "uncertain");
  const forA = presentFindReasons(r, { side: "a" });
  const forB = presentFindReasons(r, { side: "b" });
  assert.deepEqual(forA.reasons.map((x) => [x.code, x.visibility]), [["FIND_UNKNOWN_LOCATION", "searcher"]]);
  assert.deepEqual(forA.reasons[0].data, {}, "kein Rohwert „Leipzig“");
  assert.ok(forB.visible);
  assert.ok(!forB.reasons.some((x) => x.code === "FIND_UNKNOWN_LOCATION"), "b erfährt nichts von a's Kriterium");
  for (const out of [forA, forB]) {
    assert.ok(!json(out).includes("Leipzig"));
    assertUiSafe(out);
  }
});

test("privates Kriterium der Gegenseite: ausgeschlossen ohne Grund, Wert nirgends", () => {
  // Lisa (b) verlangt Design; Maria (a) bietet Vertrieb -> b's privates Kriterium schließt aus
  const r = matchFindPair(
    person("a", { ownRoles: ["sales"], seekingRoles: ["tech"] }),
    person("b", { ownRoles: ["tech"], seekingRoles: ["sales"], mustHaves: { requiredRolesAny: ["design"], minimumAvailabilityHoursPerWeek: 35 } }),
    FIND_CTX,
  );
  assert.equal(r.eligibility.status, "ineligible");
  const forA = presentFindReasons(r, { side: "a" });
  assert.deepEqual(forA, { visible: false, reasons: [] });
  for (const secret of ["design", "35", "requiredRolesAny", "minimumAvailability"]) assert.ok(!json(forA).includes(secret), secret);
});

test("offenes Kriterium der Gegenseite: Paar sichtbar, aber kein Hinweis darauf", () => {
  const r = matchFindPair(
    person("a", { seekingRoles: ["tech"], availabilityHoursPerWeek: null, locationRegion: null }),
    person("b", { ownRoles: ["tech"], mustHaves: { minimumAvailabilityHoursPerWeek: 35, desiredLocationRegion: "Hamburg" } }),
    FIND_CTX,
  );
  assert.equal(r.eligibility.status, "uncertain");
  const forA = presentFindReasons(r, { side: "a" });
  assert.ok(forA.visible);
  assert.deepEqual(forA.reasons.map((x) => x.code), ["FIND_ROLE_NEED_COVERED"]);
  for (const secret of ["35", "Hamburg", "UNKNOWN"]) assert.ok(!json(forA).includes(secret), secret);
  assert.ok(presentFindReasons(r, { side: "b" }).reasons.some((x) => x.code === "FIND_UNKNOWN_LOCATION"), "b sieht den eigenen offenen Punkt");
});

test("Blockierung und Status-Gate: nicht sichtbar, kein Grund", () => {
  const blocked = matchFindPair(person("a", { seekingRoles: ["tech"] }), person("b", { ownRoles: ["tech"] }), { ...FIND_CTX, blocked: true });
  assert.deepEqual(presentFindReasons(blocked, { side: "a" }), { visible: false, reasons: [] });
  assert.deepEqual(presentFindReasons(blocked, { side: "b" }), { visible: false, reasons: [] });
  const paused = matchFindPair(person("a"), person("b", { findProfileStatus: "paused" }), FIND_CTX);
  assert.deepEqual(presentFindReasons(paused, { side: "a" }), { visible: false, reasons: [] });
});

// ---------------------------------------------------------------------------
// FIND: Capability
// ---------------------------------------------------------------------------
const capPair = (bAllowed: boolean, bVisibility: "none" | "areas" | "areas_and_depth") =>
  matchFindPair(
    person("a", { caps: [cap("b2b_sales", 2, "prefer_other")] }),
    person("b", { caps: [cap("b2b_sales", 4, "own")], capabilityMatchingAllowed: bAllowed, capabilityVisibility: bVisibility }),
    FIND_CTX,
  );

test("Capability: Freigabe ja + Tiefe privat -> wirkt im Matching, aber kein Reason", () => {
  const r = capPair(true, "none");
  assert.equal(r.relevance.components.aToB.capCover, 1, "Matching verwendet die Angabe");
  const out = presentFindReasons(r, { side: "a" });
  assert.ok(!out.reasons.some((x) => x.code.startsWith("FIND_AREA")));
  assert.ok(!json(out).includes("b2b_sales"));
  assert.ok(!presentFindReasons(capPair(true, "areas"), { side: "a" }).reasons.some((x) => x.code.startsWith("FIND_AREA")), "nur Bereiche sichtbar reicht nicht");
});

test("Capability: Freigabe ja + Tiefe sichtbar -> Reason mit Bereich, ohne Stufe", () => {
  const out = presentFindReasons(capPair(true, "areas_and_depth"), { side: "a" });
  const area = out.reasons.find((x) => x.code === "FIND_AREA_OWN_COVERED");
  assert.ok(area);
  assert.deepEqual(area.data, { area: "b2b_sales" });
  assert.deepEqual(area.labels, { area: "capability.areaLabels" });
  assert.doesNotMatch(json(out), /level|Level|applicationLevel|"4"|ownershipWish/);
});

test("Capability: ohne Freigabe kein Reason und keine Wirkung", () => {
  const r = capPair(false, "areas_and_depth");
  assert.equal(r.relevance.components.aToB.capCover, null);
  assert.ok(!presentFindReasons(r, { side: "a" }).reasons.some((x) => x.code.startsWith("FIND_AREA")));
});

// ---------------------------------------------------------------------------
// FIND: Workstyle ist nie ein Matching-Reason
// ---------------------------------------------------------------------------
test("Workstyle-Kontext ändert die präsentierten Reasons nicht", () => {
  const r = matchFindPair(person("a", { seekingRoles: ["tech"] }), person("b", { ownRoles: ["tech"] }), FIND_CTX);
  const withWorkstyle = attachWorkstyleContext(r, { a: true, b: true }, [{ area: "EVI", pattern: "DISCUSSION_POINT" }]);
  assert.ok(withWorkstyle.workstyleContext);
  for (const side of ["a", "b"] as const) {
    assert.deepEqual(presentFindReasons(withWorkstyle, { side }), presentFindReasons(r, { side }));
    assert.doesNotMatch(json(presentFindReasons(withWorkstyle, { side })), /EVI|DISCUSSION_POINT|workstyle/i);
  }
});

// ---------------------------------------------------------------------------
// CONNECT
// ---------------------------------------------------------------------------
const idf = createIdfIndex(syntheticIdfSnapshot());
const CONNECT_CTX = { now: NOW, viewerIsNetworkMember: true, purpose: "listing_match" as const, blockedOwnerIds: new Set<string>(), computedAt: null };
const seek: ConnectListingInput = {
  listingId: "s", ownerId: "u-s", inputVersion: null, direction: "seeking", category: "expertise",
  title: "Unterstützung im Vertriebsaufbau gesucht", summary: "Wir suchen Hilfe beim Vertriebsaufbau für unsere Software.",
  topics: ["Vertrieb"], industries: ["SaaS"], locations: [], geographicScope: null, remoteMode: "remote",
  status: "active", visibility: "members_only", publishedAt: "2026-10-01", expiresAt: null,
};
const offer: ConnectOfferInput = {
  listing: {
    ...seek, listingId: "o", ownerId: "u-o", direction: "offering",
    title: "Erfahrung im Vertriebsaufbau", summary: "Ich begleite den Vertriebsaufbau von Software-Startups. Interne Notiz: Kontakt nur abends.",
    topics: ["Sales"], industries: ["Software"],
  },
  owner: { personId: "u-o", profileStatus: "active", suggestable: true, expertise: ["Pricing"] },
};

test("CONNECT: Gesuchsteller sieht Thema/Text/Branche/Kategorie, die anbietende Seite nichts", () => {
  const r = matchConnect(seek, offer, CONNECT_CTX, idf);
  const forSeeker = presentConnectReasons(r, { role: "seeker" });
  const codes = forSeeker.reasons.map((x) => x.code);
  for (const code of ["CONNECT_TOPIC_MATCH", "CONNECT_TEXT_OVERLAP", "CONNECT_SAME_INDUSTRY", "CONNECT_SAME_CATEGORY", "CONNECT_REMOTE_POSSIBLE"]) {
    assert.ok(codes.includes(code), code);
  }
  assert.ok(forSeeker.reasons.every((x) => x.visibility === "searcher"));
  assert.deepEqual(presentConnectReasons(r, { role: "offerer" }), { visible: true, reasons: [] });
  assertUiSafe(forSeeker);
});

test("CONNECT: keine IDF-Token, keine IDF-Werte, keine ganzen Texte", () => {
  const r = matchConnect(seek, offer, CONNECT_CTX, idf);
  const out = presentConnectReasons(r, { role: "seeker" });
  const s = json(out);
  assert.ok(!s.includes(seek.summary) && !s.includes(offer.listing.summary) && !s.includes("Interne Notiz"));
  assert.ok(!s.includes("synthetic-v03") && !/idf/i.test(s));
  const terms = out.reasons.find((x) => x.code === "CONNECT_TEXT_OVERLAP")?.data.terms ?? "";
  for (const word of terms.split(", ")) {
    assert.ok(`${seek.title} ${seek.summary} ${seek.topics.join(" ")}`.includes(word), `Originalwort aus dem eigenen Gesuch: ${word}`);
  }
  assert.doesNotMatch(terms, /\bvertrieb\b/, "kein normalisiertes Token");
});

test("CONNECT: ausgeschlossen -> nicht sichtbar, kein Grund", () => {
  const r = matchConnect(seek, offer, { ...CONNECT_CTX, blockedOwnerIds: new Set(["u-o"]) }, idf);
  assert.deepEqual(presentConnectReasons(r, { role: "seeker" }), { visible: false, reasons: [] });
});

// ---------------------------------------------------------------------------
// Allgemein: über viele synthetische Paare
// ---------------------------------------------------------------------------
test("synthetische FIND- und CONNECT-Paare: nur UI-sichere Ausgabe, keine Must-have-Werte", () => {
  const pool = new Set(regression.pool_ids);
  const people = synthetic.profiles.filter((p) => pool.has(p.id) && p.find_profile?.status === "active").slice(0, 25).map((p) => findPerson(p));
  let shown = 0;
  for (const a of people) {
    for (const b of people) {
      if (a.personId >= b.personId) continue;
      const r: FindMatchResult = matchFindPair(a, b, FIND_CTX);
      for (const side of ["a", "b"] as const) {
        const out = presentFindReasons(r, { side });
        assertUiSafe(out);
        shown += out.reasons.length;
        const counterpart = side === "a" ? b : a;
        const hiddenValues = [
          ...counterpart.mustHaves.requiredExpertiseAny,
          counterpart.mustHaves.desiredLocationRegion,
        ].filter((v): v is string => typeof v === "string" && v.length > 3);
        for (const v of hiddenValues) {
          const own = side === "a" ? a : b;
          const ownPublic = [...own.expertise, ...own.industries, own.locationRegion ?? ""].join(" ");
          if (!ownPublic.includes(v)) assert.ok(!json(out).includes(v), `Must-have-Wert der Gegenseite: ${v}`);
        }
      }
    }
  }
  assert.ok(shown > 0, "Stichprobe enthält Reasons");
  const seeks = [...listingsById.values()].filter(({ raw }) => raw.direction === "seeking").slice(0, 10);
  const offers = [...listingsById.values()].filter(({ raw }) => raw.direction === "offering").slice(0, 20);
  for (const s of seeks) for (const o of offers) {
    const out = presentConnectReasons(matchConnect(seekInput(s.raw.id), offerInput(o.raw.id), CONNECT_CTX, idf), { role: "seeker" });
    assertUiSafe(out);
  }
});

test("unbekannte Codes und unerwartete Parameter fallen weg (fail closed)", () => {
  const base = matchFindPair(person("a", { seekingRoles: ["tech"] }), person("b", { ownRoles: ["tech"] }), FIND_CTX);
  const tampered = {
    ...base,
    explanations: [
      ...base.explanations,
      { code: "FIND_SECRET", params: { x: "y" }, audience: "a" },
      { code: "FIND_ROLE_NEED_COVERED", params: { role: "Tech mit Leerzeichen" }, audience: "a" },
      { code: "FIND_SAME_INDUSTRY", params: { industry: "x".repeat(500) }, audience: "a" },
      { code: "FIND_LIMITED_EVIDENCE", params: {}, audience: "a" },
      { code: "FIND_ROLE_NEED_COVERED", params: { role: "tech", extra: "geheim" }, audience: "a" },
    ],
  } as unknown as FindMatchResult;
  const out = presentFindReasons(tampered, { side: "a" });
  assert.deepEqual(out.reasons.map((x) => x.code), ["FIND_ROLE_NEED_COVERED", "FIND_ROLE_NEED_COVERED"]);
  assert.ok(!json(out).includes("geheim") && !json(out).includes("LIMITED"));
});

// ---------------------------------------------------------------------------
// Copy und Vertrag
// ---------------------------------------------------------------------------
const bundle = (locale: string, ns: string) => JSON.parse(read(`messages/${locale}/${ns}.json`));

test("Message Keys DE/EN vollständig, Platzhalter passen zu den erlaubten Parametern", () => {
  for (const [ns, policy] of [["find", FIND_REASON_POLICY], ["connect", CONNECT_REASON_POLICY]] as const) {
    const de = bundle("de", ns).matchingReasons;
    const en = bundle("en", ns).matchingReasons;
    assert.deepEqual(Object.keys(de).sort(), Object.keys(policy).sort());
    assert.deepEqual(Object.keys(en).sort(), Object.keys(policy).sort());
    for (const [code, rule] of Object.entries(policy)) {
      for (const text of [de[code], en[code]]) {
        const placeholders = [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((p) => p !== "name").sort();
        assert.deepEqual(placeholders, Object.keys(rule.params).sort(), `${ns}.${code}`);
      }
    }
  }
});

test("Label-Namespaces existieren in beiden Sprachen", () => {
  const namespaces = new Set(
    [...Object.values(FIND_REASON_POLICY), ...Object.values(CONNECT_REASON_POLICY)].flatMap((p) =>
      Object.values(p.params).flatMap((r) => (r.kind === "label" ? [r.labelNamespace] : [])),
    ),
  );
  for (const locale of ["de", "en"]) {
    for (const ns of namespaces) {
      const [file, key] = ns.split(".");
      assert.equal(typeof bundle(locale, file)[key], "object", `${locale}: ${ns}`);
    }
  }
});

test("Copy: keine Scores, Prozente, Kompatibilitäts-, Fit- oder Prognose-Sprache", () => {
  const forbidden = /%|match\b|kompatib|compatib|perfekt|perfect|ideal|fit\b|erfolg|success|chance|persönlichkeit|personality|passt (sehr )?gut|score|ampel|confidence|idf/i;
  for (const locale of ["de", "en"]) {
    for (const ns of ["find", "connect"]) {
      for (const text of Object.values(bundle(locale, ns).matchingReasons) as string[]) assert.doesNotMatch(text, forbidden, text);
    }
  }
});

test("Sichtbarkeitsvertrag: Gate, Confidence, LIMITED_EVIDENCE intern; kein candidate-Code in v0.1", () => {
  assert.equal(FIND_REASON_POLICY.FIND_LIMITED_EVIDENCE.visibility, "internal");
  assert.equal(CONNECT_REASON_POLICY.CONNECT_LIMITED_EVIDENCE.visibility, "internal");
  assert.equal(FIND_REASON_POLICY.FIND_UNKNOWN_LOCATION.visibility, "searcher");
  const all = [...Object.values(FIND_REASON_POLICY), ...Object.values(CONNECT_REASON_POLICY)].map((p) => p.visibility);
  assert.ok(!all.includes("candidate"));
  const source = read("src/lib/matching/reasonPresentation.ts");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""), /eligibility\.reasons|confidence|relevance|idfCorpusVersion|workstyleContext|tieGroup/);
});

test("noch nirgends eingebunden", () => {
  const users: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "__tests__") walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && /from "@\/lib\/matching\/reasonPresentation"/.test(read(path))) users.push(path);
    }
  };
  walk("src");
  assert.deepEqual(users, []);
});
