import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { eventCheckUrl, eventSignupUrl, isValidEventSlug, slugifyEventName } from "@/features/events/adminEventModel";
import { generateQrPng } from "@/features/events/eventQrCode";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

test("an address name is made from the event name: umlauts, spaces and symbols become clean hyphens", () => {
  assert.equal(slugifyEventName("Gründungsabend Leipzig"), "gruendungsabend-leipzig");
  assert.equal(slugifyEventName("  Straße & Co. — Meetup #3!  "), "strasse-co-meetup-3");
  assert.equal(slugifyEventName("x".repeat(80)).length, 60);
  assert.equal(isValidEventSlug("gruendungsabend-leipzig"), true);
  for (const bad of ["ab", "Mit Leerzeichen", "-anfang", "ende-", "doppel--strich", "ümlaut"]) assert.equal(isValidEventSlug(bad), false, bad);
});

test("the two QR codes point to the sign-up page and the event check of the same event", () => {
  assert.equal(eventSignupUrl("https://made2found.de", "gruendungsabend-leipzig"), "https://made2found.de/hallo?event=gruendungsabend-leipzig");
  assert.equal(eventCheckUrl("https://made2found.de", "gruendungsabend-leipzig"), "https://made2found.de/event/gruendungsabend-leipzig");
});

test("a QR code is only accepted when the encoder really returns a PNG", async () => {
  const png = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString("base64");
  assert.deepEqual(await generateQrPng("x", 640, async () => png), { ok: true, dataUrl: png });
  assert.deepEqual(await generateQrPng("x", 640, async () => "data:text/html;base64,AAAA"), { ok: false });
  assert.deepEqual(await generateQrPng("x", 640, async () => { throw new Error("boom"); }), { ok: false });
});

test("the admin page and its actions are admin-only; the public page shows only the name and counts nothing", () => {
  assert.match(read("src/app/(product)/admin/veranstaltungen/page.tsx"), /requirePlatformAdmin\(\)/);
  const actions = read("src/features/events/adminEventActions.ts");
  assert.equal((actions.match(/export async function/g) ?? []).length, (actions.match(/await requirePlatformAdmin\(\)/g) ?? []).length);
  const hallo = read("src/app/hallo/page.tsx");
  assert.match(hallo, /get_public_event_name/);
  assert.doesNotMatch(hallo, /cookies\(|localStorage|analytics|track/i, "nothing is counted");
  const sql = read("../supabase/migrations/20270501120000_admin_events.sql");
  assert.match(sql, /grant execute on function public\.get_public_event_name\(text\) to anon, authenticated/);
  assert.match(sql, /select e\.name from public\.events e/);
  assert.doesNotMatch(sql.slice(sql.indexOf("get_public_event_name(p_slug")), /e\.status|participants|starts_at/ , "the public function returns only the name");
});

test("German and English have the same keys for the admin page and the sign-up page", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  const a = (l: string) => JSON.parse(read(`messages/${l}/admin.json`)).eventsQr;
  const h = (l: string) => JSON.parse(read(`messages/${l}/auth.json`)).hallo;
  assert.deepEqual(keys(a("de")).sort(), keys(a("en")).sort());
  assert.deepEqual(keys(h("de")).sort(), keys(h("en")).sort());
  assert.doesNotMatch(JSON.stringify([a("en"), h("en")]), /[äöüÄÖÜß]/);
});
