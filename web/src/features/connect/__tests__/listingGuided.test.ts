import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  LISTING_GUIDED_LIMITS,
  LISTING_HELP_KINDS,
  LISTING_SUMMARY_MAX,
  LISTING_TIME_KINDS,
  composeSeekingSummary,
  type ListingSummaryLabels,
} from "@/features/connect/listingSummary";

const root = join(import.meta.dirname, "..", "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const labels: ListingSummaryLabels = {
  tried: "Schon versucht",
  stuck: "Wo es klemmt",
  help: "Hilfe",
  time: "Zeit",
  helpKinds: { counter_view: "Gegenblick", experience: "Erfahrung", contact: "Kontakt", material: "Material" },
  timeKinds: { five_minutes: "5 Minuten", fifteen_minutes: "15 Minuten", conversation: "Ein Gespräch" },
};

test("Leere Leitfragen lassen den Kontext unveraendert", () => {
  assert.deepEqual(
    composeSeekingSummary({ main: "  Ich suche jemanden fuer die Preisstruktur.  ", tried: "", stuck: " ", help: [], time: "" }, labels),
    { ok: true, summary: "Ich suche jemanden fuer die Preisstruktur.", mainLength: "Ich suche jemanden fuer die Preisstruktur.".length }
  );
});

test("Die Leitfragen werden zu beschrifteten Zeilen, in fester Reihenfolge", () => {
  const result = composeSeekingSummary(
    {
      main: "Ich suche jemanden, der meine Preisstruktur durchgeht.",
      tried: "Drei Preisstufen getestet.",
      stuck: "Nutzer oder Firmen?",
      help: ["material", "counter_view"],
      time: "fifteen_minutes",
    },
    labels
  );
  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(
      result.summary,
      "Ich suche jemanden, der meine Preisstruktur durchgeht.\n\nSchon versucht: Drei Preisstufen getestet.\n\nWo es klemmt: Nutzer oder Firmen?\n\nHilfe: Gegenblick, Material · Zeit: 15 Minuten"
    );
  }
});

test("Unbekannte Werte bei Hilfe und Zeit kommen nicht in den Text", () => {
  const result = composeSeekingSummary(
    { main: "Ein ausreichend langer Kontext fuer dieses Gesuch.", tried: "", stuck: "", help: ["experience", "<script>"], time: "irgendwas" },
    labels
  );
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.summary, "Ein ausreichend langer Kontext fuer dieses Gesuch.\n\nHilfe: Erfahrung");
});

test("Alle Felder an der Grenze passen zusammen unter 800 Zeichen, zu viel wird abgewiesen", () => {
  const full = composeSeekingSummary(
    {
      main: "a".repeat(LISTING_GUIDED_LIMITS.main),
      tried: "b".repeat(LISTING_GUIDED_LIMITS.tried),
      stuck: "c".repeat(LISTING_GUIDED_LIMITS.stuck),
      help: [...LISTING_HELP_KINDS],
      time: LISTING_TIME_KINDS[2],
    },
    labels
  );
  assert.ok(full.ok, "die Grenzen der Felder muessen zusammen unter der Grenze des Kontexts liegen");
  if (full.ok) assert.ok(full.summary.length <= LISTING_SUMMARY_MAX);
  assert.deepEqual(
    composeSeekingSummary({ main: "a".repeat(LISTING_SUMMARY_MAX), tried: "b", stuck: "", help: [], time: "" }, labels),
    { ok: false, reason: "too_long" }
  );
});

test("Die Mindestlaenge gilt fuer den Kontext allein", () => {
  const action = read("src/features/connect/connectActions.ts");
  assert.match(action, /contextLength < LISTING_SUMMARY_MIN/);
  assert.match(action, /formData\.get\("guided"\) === "1" && rawDirection === "seeking"/);
  // Nur beim Anlegen: Beim Bearbeiten steht der Text schon im Kontext.
  assert.match(action, /if \(!id && formData\.get\("guided"\)/);
});

test("Das Formular zeigt die Leitfragen nur beim Anlegen eines Gesuchs", () => {
  const form = read("src/features/connect/ConnectListingForm.tsx");
  assert.match(form, /const guided = !listing && selectedDirection === "seeking"/);
  assert.match(form, /name="tried"/);
  assert.match(form, /name="stuck"/);
  assert.match(form, /name="help"/);
  assert.match(form, /name="time"/);
});

test("Die Statuszeile verspricht nichts und ist nur fuer die eigene Person", () => {
  const page = read("src/app/(product)/connect/listings/[listingId]/page.tsx");
  assert.match(page, /ownActive && replyCount === 0 && daysOnBoard >= 1/);
  assert.match(page, /countContactRequestsForListing/);
  for (const locale of ["de", "en"]) {
    const detail = JSON.parse(read(`messages/${locale}/connect.json`)).detail;
    for (const key of ["noReply", "noReplyLong"]) {
      assert.match(detail[key], /\{days\}/, `${locale}.${key}`);
      assert.doesNotMatch(detail[key], /Werktag|innerhalb von|within \d|we will reply|wir antworten/i, `${locale}.${key}: keine Zusage`);
    }
  }
});

test("Alle Texte der Leitfragen gibt es in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(read(`messages/${locale}/connect.json`));
    const guided = messages.form.guided;
    for (const key of ["main", "mainHint", "tried", "triedHint", "stuck", "stuckHint", "help", "time", "timeAny"]) assert.ok(guided[key], `${locale}.${key}`);
    for (const kind of LISTING_HELP_KINDS) assert.ok(guided.helpKinds[kind], `${locale}.helpKinds.${kind}`);
    for (const kind of LISTING_TIME_KINDS) assert.ok(guided.timeKinds[kind], `${locale}.timeKinds.${kind}`);
    for (const key of ["tried", "stuck", "help", "time"]) assert.ok(guided.stored[key], `${locale}.stored.${key}`);
    assert.ok(messages.errors.listing_summary_too_long, `${locale}: Fehlertext`);
  }
});
