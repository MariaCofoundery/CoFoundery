import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Das Identitaetsformular steht seit dem 20.10.2026 in `IdentityEditor` (auch auf FIND und Connect
// eingebettet); die Profilseite bindet es ein. Beide zusammen sind "die Profilseite".
const source = (path: string) =>
  readFileSync(path, "utf8") +
  (path.replaceAll("\\", "/").endsWith("(product)/profile/page.tsx")
    ? readFileSync("src/features/profile/IdentityEditor.tsx", "utf8")
    : "");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;
const sqlWithoutComments = (path: string) =>
  source(path)
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");

const MIGRATION = "../supabase/migrations/20260927120000_member_photo_visibility.sql";

/**
 * Ein Bild, eine Entscheidung.
 *
 * Plattformen trennen nach Publikum, nicht nach Bereich: Slack hat ein Bild je
 * Workspace, LinkedIn EIN Bild mit gestaffelter Sichtbarkeit. Align und Find
 * haben dasselbe Publikum - also ein Bild. Connect behaelt sein eigenes, weil
 * dort oeffentliche Seiten haengen.
 */

test("nobody's photo becomes visible without them switching it on", () => {
  const migration = sqlWithoutComments(MIGRATION);
  // Ein heute hochgeladenes Bild sieht nur die eigene Person. Es rueckwirkend
  // allen zu zeigen, waere eine Ausweitung ohne Zustimmung.
  assert.match(migration, /photo_visible_to_members boolean not null default false/);
});

test("the function hands out photos only, and only with consent", () => {
  const migration = sqlWithoutComments(MIGRATION);
  const fn = migration.slice(
    migration.indexOf("create or replace function public.list_member_photos"),
    migration.indexOf("comment on function public.list_member_photos")
  );
  assert.match(fn, /profile\.user_id = auth\.uid\(\) or core\.photo_visible_to_members/);
  // Nur Bildangaben: Ein Name kaeme sonst an der Zeilensicherheit von
  // profiles vorbei.
  assert.doesNotMatch(fn, /display_name|headline|bio/);
  assert.match(fn, /raise exception 'authentication_required'/);
});

test("revoking actually works, because the serving route asks too", () => {
  const route = source("src/app/api/profile/photo/[...path]/route.ts");
  // Die Route lieferte jeder angemeldeten Person jeden gueltigen Pfad aus.
  // Nicht zu erraten ist keine Zustimmung, und ein weitergegebener Link
  // liesse sich sonst nie entziehen.
  assert.match(route, /can_read_member_photo/);
  assert.match(route, /const ownerUserId = objectPath\.slice\(0, objectPath\.indexOf\("\/"\)\)/);
});

test("Connect keeps its own decision", () => {
  // Dort haengen oeffentliche Seiten dran - ein anderes Publikum, also eine
  // eigene Einwilligung. Die neue Spalte darf daran nichts aendern.
  const connectAvatar = source("src/features/connect/ConnectAvatar.tsx");
  assert.match(connectAvatar, /photo_avatar_id/);
  assert.doesNotMatch(connectAvatar, /photo_visible_to_members|list_member_photos/);

  const de = (readJson("messages/de/capability.json").identity as Record<string, string>)
    .photoVisibleHint;
  assert.match(de, /Connect/, "und der Text sagt das auch");
});

test("Find shows the photo where it shows the person", () => {
  const card = source("src/features/discovery/FounderDiscoveryCard.tsx");
  assert.match(card, /<ProfileAvatar/);
  assert.match(card, /avatarId=\{photo\?\.avatarId\}/);

  const list = source("src/app/(product)/discovery/page.tsx");
  assert.match(list, /getMemberPhotos\(/);
  const detail = source("src/app/(product)/discovery/[profileId]/page.tsx");
  assert.match(detail, /getMemberPhotos\(supabase, \[profile\.userId\]\)/);
});

test("the switch sits with the photo, not in a settings corner", () => {
  // GEAENDERT am 20.10.2026: Der Schalter steht im Fotobereich ("Wo dein Foto zu sehen ist"), mit eigener
  // Aktion - und nicht mehr im Identitaetsformular, dessen Speichern ihn sonst zurueckgesetzt haette.
  const panel = source("src/features/profile/PhotoUsagePanel.tsx");
  assert.match(panel, /name="photo_visible_to_members"/);
  const usage = source("src/features/profile/photoUsageActions.ts");
  assert.match(usage, /photo_visible_to_members: formData\.get\("photo_visible_to_members"\) === "yes"/);
  const identity = source("src/features/profile/personCoreActions.ts");
  assert.doesNotMatch(identity, /photo_visible_to_members: formData/);

  for (const locale of ["de", "en"]) {
    const identity = (readJson(`messages/${locale}/capability.json`).identity as Record<string, string>);
    assert.equal(typeof identity.photoVisibleLabel, "string", `${locale}: Label fehlt`);
    assert.equal(typeof identity.photoVisibleHint, "string", `${locale}: Hinweis fehlt`);
  }
});
