import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { getHomepageContent, HOMEPAGE_ALLOWED_CLAIMS } from "@/data/homepage";

const page = readFileSync("src/app/(marketing)/page.tsx", "utf8");
const nav = readFileSync("src/components/marketing/HomepageNav.tsx", "utf8");
const journey = readFileSync("src/components/marketing/StarJourney.tsx", "utf8");
const effects = readFileSync("src/components/marketing/LandingEffects.tsx", "utf8");
const topics = readFileSync("src/components/marketing/SetupTopics.tsx", "utf8");
const faq = readFileSync("src/components/marketing/FaqAccordion.tsx", "utf8");
const floating = readFileSync("src/components/marketing/FloatingStart.tsx", "utf8");
const css = readFileSync("src/components/marketing/landing.module.css", "utf8");

type Locale = "de" | "en";
const LOCALES: Locale[] = ["de", "en"];

function allText(locale: Locale) {
  return JSON.stringify(getHomepageContent(locale));
}
/** Der gesamte Text, ohne die wenigen Saetze, in denen Scores oder der Preis ausdruecklich genannt werden duerfen. */
function textWithoutAllowedClaims(locale: Locale) {
  return HOMEPAGE_ALLOWED_CLAIMS[locale].reduce((text, claim) => text.split(JSON.stringify(claim).slice(1, -1)).join(""), allText(locale));
}

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]));
  return typeof value;
}

test("de and en carry exactly the same structure, down to the list lengths", () => {
  assert.deepEqual(shape(getHomepageContent("de")), shape(getHomepageContent("en")));
});

test("the homepage names no score, ranking or compatibility verdict, except where it denies them", () => {
  for (const locale of LOCALES) {
    assert.doesNotMatch(textWithoutAllowedClaims(locale), /kompatibel|compatib|score|punkte|prozent|percent|ranking|rangliste|rangfolge|passt zu|traffic light|ampel/i, locale);
  }
});

test("the few sentences that mention a score or the price are exactly the allowed ones, and say no", () => {
  for (const locale of LOCALES) {
    const [noScore, findNote, price] = HOMEPAGE_ALLOWED_CLAIMS[locale];
    for (const claim of HOMEPAGE_ALLOWED_CLAIMS[locale]) assert.ok(allText(locale).includes(JSON.stringify(claim).slice(1, -1)), `${locale}: ${claim} is on the page`);
    assert.match(noScore, locale === "de" ? /^Nein\./ : /^No\./);
    assert.match(findNote, locale === "de" ? /keine Rangfolge .* keinen Score/ : /no ranking .* no score/);
    // "Im Moment kostenlos" ist eine Angabe von Maria, bewusst befristet formuliert.
    assert.match(price, locale === "de" ? /^Im Moment ist .* kostenlos\.$/ : /^Right now, .* is free\.$/);
  }
});

test("the homepage makes no unproven promises or numbers", () => {
  for (const locale of LOCALES) {
    assert.doesNotMatch(textWithoutAllowedClaims(locale), /kostenlos|free of charge|gratis|\d+\s*%|garantiert|guarantee|bleibt kostenlos|always free/i, locale);
  }
});

test("every example is labelled as an example, and the screen-reader labels say the data is made up", () => {
  // Das sichtbare Etikett ist nur "Beispiel" (Maria, 24.11.2026); die Vorlesebeschriftungen bleiben ausfuehrlich.
  assert.equal(getHomepageContent("de").example, "Beispiel");
  assert.equal(getHomepageContent("en").example, "Example");
  assert.match(getHomepageContent("de").overview.find.windowLabel, /erfundenen/);
  assert.match(getHomepageContent("en").overview.find.windowLabel, /made-up/);
  assert.equal((page.match(/\{c\.example\}/g) ?? []).length >= 2, true);
});

test("no invented voices: Maria's own word is her statement, the testimonial block stays out", () => {
  assert.doesNotMatch(page, /Was andere sagen|Platzhalter|testimonial/i);
  assert.ok(existsSync("public/brand/maria.jpg"));
  assert.match(page, /src="\/brand\/maria\.jpg"/);
});

test("every call to action leads into the sign-in, and the closed beta stays visible", () => {
  assert.equal((page.match(/href="\/start"/g) ?? []).length >= 3, true);
  assert.match(page, /href="\/login"/);
  assert.match(page, /getBetaAccessRequestHref\(\)/);
  assert.match(page, /id="zugang"/);
  assert.match(nav, /href="\/start"/);
  assert.match(nav, /href="\/login"/);
  assert.match(journey, /href="\/start"/);
  assert.match(journey, /href="#zugang"/);
  assert.match(floating, /href="\/start"/);
});

test("anchors that links point to exist", () => {
  assert.match(nav, /\/#so/);
  assert.match(nav, /\/#bereiche/);
  assert.match(page, /id="so"/);
  assert.match(page, /id="bereiche"/);
  for (const door of getHomepageContent("de").doors.items) {
    if (door.href.startsWith("#")) assert.match(page, new RegExp(`id="${door.href.slice(1)}"`), door.href);
  }
});

test("sections keep their order: journey, why, doors, overview, setup, founder, network, outcomes, faq, closing", () => {
  const ids = ["so", "why-title", "doors-title", "overview-title", "setup-title", "founder-title", "net-title", "outcomes-title", "faq-title", "closing-title"];
  const order = ids.map((id) => page.indexOf(`"${id}"`));
  assert.ok(order.every((index) => index > 0), "every section id is on the page");
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("the journey has one chapter per area and a way to jump to each", () => {
  for (const locale of LOCALES) {
    const j = getHomepageContent(locale).journey;
    assert.equal(j.chapters.length, 5);
    assert.equal(j.dots.length, 6);
    assert.equal(j.headline.length, 2);
  }
});

test("less motion: nothing moves in time, text only fades, and the page stays complete", () => {
  assert.match(journey, /prefers-reduced-motion: reduce/);
  assert.match(effects, /prefers-reduced-motion: reduce/);
  assert.match(topics, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("the journey only runs while it is in view and cleans up after itself", () => {
  assert.match(journey, /IntersectionObserver/);
  assert.match(journey, /cancelAnimationFrame/);
  assert.match(journey, /removeEventListener\("scroll"/);
});

test("the questions open one at a time, with proper button semantics", () => {
  assert.match(faq, /useState<number \| null>/);
  assert.match(faq, /aria-expanded=\{isOpen\}/);
  assert.match(faq, /aria-controls/);
  assert.match(faq, /role="region"/);
});

test("the topic list stops changing by itself once someone touches it", () => {
  assert.match(topics, /manual\.current = true/);
  assert.match(topics, /if \(manual\.current\)/);
});

test("scroll effects never hide what is visible on load and never touch client components' classes", () => {
  assert.match(effects, /getBoundingClientRect\(\)\.top >= vh \* 0\.9/);
  assert.doesNotMatch(page, /<FaqAccordion[^>]*data-rv/);
  assert.doesNotMatch(page, /<SetupTopics[^>]*data-rv/);
});

test("the first screen is light: the headline, one sentence, two buttons - no label above the headline and no reassurance line (Maria, 25.11.2026)", () => {
  // Rueckmeldung zur Startseite: zu viel "typisches KI-Design". Darum stehen "Made2Found" ueber der Ueberschrift und
  // "Dauert ein paar Minuten ..." unter den Knoepfen nicht mehr da; die Aussage zum Datenschutz steht in den Fragen.
  for (const locale of LOCALES) {
    const content = getHomepageContent(locale).journey as Record<string, unknown>;
    assert.equal("label" in content, false, `${locale}: no label above the headline`);
    assert.equal("fine" in content, false, `${locale}: no reassurance line`);
  }
  assert.doesNotMatch(journey, /content\.label|content\.fine/);
  assert.doesNotMatch(allText("de"), /Dauert ein paar Minuten\. Deine Antworten/);
  assert.match(allText("de"), /Erst einmal nur du\./, "the privacy statement is still in the questions");
});

test("the bridge heading is two short lines that never wrap (24.11.2026: 'Herausforderndes angehen.')", () => {
  assert.deepEqual(getHomepageContent("de").bridge.lines, ["Das Gute verstärken.", "Herausforderndes angehen."]);
  assert.match(css, /\.bridge h2 \{[^}]*white-space: nowrap/);
});

test("on the phone the topic question opens right under the tapped topic and the list does not move by itself", () => {
  assert.match(topics, /styles\.inlineQ/);
  assert.match(topics, /max-width: 899px/);
  assert.match(css, /\.focus \{[^}]*display: none/);
  assert.match(css, /@media \(min-width: 900px\)[^\n]*\.focus \{ display: flex/);
});

test("Maria's word carries her wording of 24.11.2026 (de) and a matching english version", () => {
  const de = getHomepageContent("de").founder.paragraphs;
  assert.match(de[0], /und dass wir uns wieder mehr gegenseitig unterstützen\.$/);
  assert.match(de[1], /eine stabile Basis aufbaut, kann man sich als junges Unternehmen vor solchen Brüchen schützen\.$/);
  assert.equal(getHomepageContent("en").founder.paragraphs.length, de.length);
});
