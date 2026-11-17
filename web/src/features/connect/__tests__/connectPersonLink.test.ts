import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

test("the person link is one block for image and name, with focus ring, hover and a screen reader label", () => {
  const src = read("src/features/connect/ConnectPersonLink.tsx");
  assert.match(src, /href=\{`\/connect\/people\/\$\{userId\}`\}/);
  assert.match(src, /aria-label=\{t\("linkPerson", \{ name \}\)\}/);
  assert.match(src, /min-h-11/);
  assert.match(src, /focus-visible:ring-2/);
  assert.match(src, /group-hover\/person:underline/);
  assert.match(src, /if \(!userId \|\| plain\) return <span/, "no link for people who left or inside another link");
});

test("every place that shows a person in Connect uses the shared link", () => {
  for (const path of [
    "src/app/(product)/connect/people/page.tsx",
    "src/app/(product)/connect/contacts/page.tsx",
    "src/app/(product)/messages/[conversationId]/page.tsx",
    "src/app/(product)/connect/listings/[listingId]/page.tsx",
    "src/app/(product)/connect/ventures/page.tsx",
    "src/app/(product)/connect/ventures/[ventureId]/page.tsx",
    "src/app/(product)/connect/problems/[problemId]/page.tsx",
    "src/features/connect/ConnectListingCard.tsx",
    "src/features/connect/ConnectFeedRow.tsx",
    "src/features/connect/ProblemApproaches.tsx",
  ]) assert.match(read(path), /<ConnectPersonLink/, path);
});

test("the contact cards link both kinds of card to the counterpart's profile", () => {
  const src = read("src/app/(product)/connect/contacts/page.tsx");
  assert.match(src, /userId=\{counterpartId\}/);
  assert.match(src, /userId=\{conversation\.counterpart_user_id\}/);
});

test("the link text exists in both languages", () => {
  for (const lang of ["de", "en"]) assert.match(JSON.parse(read(`messages/${lang}/connect.json`)).linkPerson, /\{name\}/);
});
