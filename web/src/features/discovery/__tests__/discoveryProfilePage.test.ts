import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

/** Quelltext ohne Kommentare - ein Kommentar darf keine Pruefung erfuellen. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "src/app/(product)/discovery/profile/page.tsx";

// ---------------------------------------------------------------------------
// Die Eingabetaste darf nichts veroeffentlichen
// ---------------------------------------------------------------------------
test("saving comes before publishing in the form", () => {
  const page = codeOnly(PAGE);
  const save = page.indexOf('t("profile.actions.saveDraft")');
  const publish = page.indexOf("formAction={publishProfileFromForm}");
  assert.ok(save > -1 && publish > -1);
  // Ein Zeilenumbruch in einem Textfeld loest den ersten Absendeknopf im
  // Formular aus. Stuende dort das Veroeffentlichen, waere das Profil
  // versehentlich sichtbar.
  assert.ok(save < publish, "der Speicherknopf steht zuerst im Formular");
});

// ---------------------------------------------------------------------------
// Pausieren nur, wenn es etwas zu pausieren gibt
// ---------------------------------------------------------------------------
test("the pause button only exists for a published profile", () => {
  const page = codeOnly(PAGE);
  const pause = page.indexOf("action={pauseProfile}");
  assert.ok(pause > -1);
  const before = page.slice(0, pause);
  assert.match(
    before.slice(-400),
    /profile\.status === "active" \? \(/,
    "ein Entwurf laesst sich nicht pausieren - das tat sichtbar nichts"
  );
});

test("a paused profile is resumed, not published again", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /profile\.status === "paused"\s*\?\s*t\("profile\.actions\.resume"\)/);
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/discovery.json`);
    const actions = (messages.profile as Record<string, Record<string, string>>).actions;
    assert.equal(typeof actions.resume, "string", `${locale}: actions.resume fehlt`);
    assert.equal(typeof actions.resuming, "string", `${locale}: actions.resuming fehlt`);
    assert.equal(typeof actions.pauseHelp, "string", `${locale}: actions.pauseHelp fehlt`);
  }
});

// ---------------------------------------------------------------------------
// Die fehlenden Angaben stehen einmal auf der Seite, nicht zweimal
// ---------------------------------------------------------------------------
test("the publish issues are listed where the action is, and only there", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /<PublishIssuesCard issues=\{publishIssues\}/);
  // Die Meldung oben bekommt keine Liste mehr - nach einem gescheiterten
  // Veroeffentlichen stand dieselbe Aufzaehlung zweimal da.
  assert.match(page, /<PageMessage[\s\S]{0,120}issues=\{\[\]\}/);
});

// ---------------------------------------------------------------------------
// Die Vorschau zeigt, was schon bekannt ist
// ---------------------------------------------------------------------------
test("the preview reads from person_core first", () => {
  const page = codeOnly(PAGE);
  // person_core ist die Quelle; das Suchprofil ist hoechstens so aktuell wie
  // der letzte Speichervorgang. Und emptyProfile() setzt remoteMode auf
  // "flexible" - ein Rueckfall andersherum waere dort nie zum Zug gekommen.
  assert.match(page, /core\?\.display_name \|\| profile\.displayName/);
  assert.match(page, /core\?\.headline \|\| profile\.headline/);
  assert.match(page, /core\?\.remote_mode \|\| profile\.remoteMode/);
  assert.match(page, /core\?\.expertise\?\.length \? core\.expertise/);
  assert.match(page, /core\?\.industries\?\.length \? core\.industries/);
});

test("the identity block names everything it actually covers", () => {
  const page = codeOnly(PAGE);
  // Expertise, Branchen und Arbeitsweise stehen in der Vorschau. Wer sie dort
  // leer sah, fand vorher keinen Ort, sie zu ergaenzen.
  for (const key of [
    "profile.publicProfile.identityExpertise",
    "profile.publicProfile.identityIndustries",
    "profile.publicProfile.identityWorkFrame",
  ]) {
    assert.ok(page.includes(key), `${key} fehlt im Identitaetsblock`);
  }

  const de = readJson("messages/de/discovery.json");
  const publicProfile = (de.profile as Record<string, Record<string, string>>).publicProfile;
  assert.match(publicProfile.identityText, /Expertise/);
  assert.match(publicProfile.identityText, /Arbeitsweise/);
});

// ---------------------------------------------------------------------------
// Der Zustand steht einmal da, nicht dreimal
// ---------------------------------------------------------------------------
test("the status is shown once, not as a row of pseudo-switches", () => {
  const page = codeOnly(PAGE);
  assert.doesNotMatch(
    page,
    /\(\["draft", "active", "paused"\] as const\)\.map/,
    "alle drei Zustaende nebeneinander sahen aus wie eine Umschaltung"
  );
  assert.match(page, /t\(`status\.\$\{status\}`\)/);
});

// ---------------------------------------------------------------------------
// Das Private steht nicht im selben Kasten wie das Sichtbare
// ---------------------------------------------------------------------------
test("the private alignment block has its own frame", () => {
  const page = source(PAGE);
  assert.match(page, /\$\{CARD_CLASS\}[^`]*border-violet-100 bg-violet-50\/50/);
  const profileForm = page.indexOf("<form action={saveProfileDraft}");
  const alignment = page.indexOf("border-violet-100 bg-violet-50/50");
  const formEnd = page.indexOf("</form>", profileForm);
  assert.ok(formEnd < alignment, "der private Block liegt ausserhalb des Profilformulars");
});

// ---------------------------------------------------------------------------
// Der Zurueck-Weg
// ---------------------------------------------------------------------------
test("the back link is large enough to hit", () => {
  const page = source(PAGE);
  const link = page.slice(page.indexOf('href="/discovery"') - 120, page.indexOf('href="/discovery"') + 320);
  assert.match(link, /min-h-11/, "44px Ziel - vorher war es ein blosser Textlink");
  assert.match(link, /←/, "und ein Pfeil, wie ueberall sonst im Produkt");
});

// ---------------------------------------------------------------------------
// Das Altfeld ist weg - und bleibt weg
// ---------------------------------------------------------------------------
test("locationLabel exists nowhere any more", () => {
  const files = [
    PAGE,
    "src/app/(product)/discovery/intros/page.tsx",
    "src/app/(product)/discovery/intros/[introRequestId]/matching/page.tsx",
    "src/app/(product)/discovery/[profileId]/page.tsx",
    "src/features/discovery/discoveryActions.ts",
    "src/features/discovery/discoveryData.ts",
    "src/features/discovery/discoveryTypes.ts",
    "src/features/discovery/discoveryValidation.ts",
    "src/features/discovery/discoveryConfig.ts",
    "src/features/discovery/discoveryIntroData.ts",
    "src/features/discovery/discoveryV2Search.ts",
    "src/features/discovery/discoveryRecommendation.ts",
    "src/features/discovery/discoverySavedSearchMatching.ts",
    "src/features/matchingCore/matchingCoreData.ts",
  ];
  for (const file of files) {
    assert.doesNotMatch(
      source(file),
      /locationLabel|location_label/,
      `${file}: das Altfeld ist abgeloest`
    );
  }
});

test("saved searches match against the current region, not a frozen label", () => {
  const matcher = source("src/features/discovery/discoverySavedSearchMatching.ts");
  // Der Altwert wurde seit der Profilzusammenlegung nie mehr aktualisiert.
  // Wer umzog, wurde weiter am alten Ort gefunden.
  assert.match(matcher, /locationRegion: string \| null;/);
  assert.match(matcher, /const label = profile\.locationRegion \?\? "";/);
});

test("the migration rescues the old values before dropping the column", () => {
  const migration = source(
    "../supabase/migrations/20260921120000_drop_discovery_location_label.sql"
  );
  const backfillCore = migration.indexOf("update public.person_core");
  const backfillProfile = migration.indexOf("update public.founder_discovery_profiles");
  const drop = migration.indexOf("drop column location_label");
  assert.ok(backfillCore > -1 && backfillProfile > -1 && drop > -1);
  // Die Reihenfolge ist der Punkt: Bei frueheren Nutzerinnen kann der Altwert
  // der einzige Ort sein, an dem je ein Ort stand.
  assert.ok(backfillCore < drop, "erst in die Identitaet retten");
  assert.ok(backfillProfile < drop, "dann ins Suchprofil, dann erst loeschen");
});

// ---------------------------------------------------------------------------
// Bewegung mit Aufgabe, und abbestellbar
// ---------------------------------------------------------------------------
test("the completion meter counts the same eight things publishing requires", () => {
  const page = codeOnly(PAGE);
  // Kein zweites Mass: Der Balken zaehlt die Punkte, die auch die Liste
  // darunter aufzaehlt - sonst stuenden zwei Wahrheiten auf einer Seite.
  assert.match(page, /const total = DISCOVERY_PROFILE_PUBLISH_ISSUES\.length/);
  assert.match(page, /const done = total - issues\.length/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /aria-valuenow=\{done\}/);
});

test("every animation can be switched off", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const block = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  for (const name of ["discovery-rise", "discovery-meter-fill"]) {
    assert.ok(block.includes(`.${name}`), `${name} fehlt in der reduced-motion-Regel`);
  }
  // Der Endzustand bleibt sichtbar - "both" statt eines Startzustands, der
  // ohne Animation stehen bliebe.
  assert.match(css, /animation: discovery-rise [^;]*both;/);
  assert.match(css, /animation: discovery-meter [^;]*both;/);
});

test("the form no longer nests three frames deep", () => {
  const page = codeOnly(PAGE);
  assert.doesNotMatch(
    page,
    /INNER_SECTION_CLASS = "rounded-3xl border/,
    "Karte im Kasten im Kasten - jede Ueberschrift sah aus wie eine eigene Seite"
  );
  assert.match(page, /INNER_SECTION_CLASS = "border-t border-slate-200/);
});

// ---------------------------------------------------------------------------
// "Anderer Schwerpunkt" - und welcher?
// ---------------------------------------------------------------------------
const ROLE_FIELD = "src/features/discovery/DiscoveryRoleField.tsx";

test("choosing 'other' asks which one", () => {
  const field = codeOnly(ROLE_FIELD);
  assert.match(field, /const otherChosen = selected\.includes\("other"\)/);
  // Pflicht, nicht optional: Ein Profil, in dem nur "Anderer Schwerpunkt"
  // steht, sagt der suchenden Person weniger als gar nichts.
  assert.match(field, /name=\{otherName\}\s*\n\s*required/);
});

test("the free text appears everywhere the roles do", () => {
  const presentation = codeOnly("src/features/discovery/discoveryPresentation.ts");
  assert.match(presentation, /role === "other" && text \? text : labelFor\(role\)/);

  // Eine gemeinsame Stelle, weil die Rollen an mehreren Orten gerendert
  // werden - sonst zeigt eine Anzeige die Floskel und die naechste den Text.
  for (const file of [PAGE, "src/features/discovery/FounderDiscoveryCard.tsx"]) {
    assert.match(source(file), /discoveryRoleLabels/, `${file} nutzt die gemeinsame Stelle`);
  }
});

test("the database refuses a text that belongs to no role", () => {
  const migration = source(
    "../supabase/migrations/20260922120000_discovery_role_other_text.sql"
  );
  // Sonst blieb nach dem Abwaehlen ein Satz im Profil stehen - sichtbar fuer
  // andere, unsichtbar fuer die schreibende Person.
  assert.match(migration, /'other' = any\(own_roles\)/);
  assert.match(migration, /'other' = any\(seeking_roles\)/);
});

test("the search projection carries the free text", () => {
  const migration = source(
    "../supabase/migrations/20260922120000_discovery_role_other_text.sql"
  );
  assert.match(migration, /own_role_other text,\n  seeking_role_other text,/);
  // Und die Funktion bleibt, was sie war: Sie stuetzt sich auf die
  // Zeilensicherheit der Tabelle, statt sie zu umgehen.
  assert.match(migration, /security invoker/);
  assert.doesNotMatch(migration, /security definer/);
  assert.match(migration, /p_roles text\[\] default/, "die Parameternamen bleiben");
});

// ---------------------------------------------------------------------------
// Die Obergrenze greift sichtbar
// ---------------------------------------------------------------------------
test("the fourth role cannot be clicked instead of silently dropped", () => {
  const field = codeOnly(ROLE_FIELD);
  assert.match(field, /const disabled = !checked && atLimit/);
  // Gesetzte bleiben anklickbar - sonst koennte man am Limit nur aufgeben.
  assert.match(field, /copy\.counter\(selected\.length, max\)/);
  assert.match(field, /aria-live="polite"/);
});

// ---------------------------------------------------------------------------
// Einheiten und Erklaerungen
// ---------------------------------------------------------------------------
test("the availability field says hours per week", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /profile\.publicProfile\.availabilitySuffix/);
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/discovery.json`);
    const publicProfile = (messages.profile as Record<string, Record<string, string>>)
      .publicProfile;
    assert.match(publicProfile.availabilityV2, /Stunden pro Woche|hours per week/);
    assert.ok(publicProfile.availabilitySuffix.length > 0);
  }
});

test("every option of the three selects explains itself", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /optionHint=\{\(option\) => t\(`commitmentLevelHints\./);
  assert.match(page, /optionHint=\{\(option\) => t\(`ventureStageHints\./);
  assert.match(page, /optionHint=\{\(option\) => t\(`ventureGoalHints\./);

  // Jede Option braucht ihren Satz - eine fehlende Erklaerung zeigt sonst
  // stumm den Schluesselpfad an.
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/discovery.json`);
    for (const group of ["commitmentLevels", "ventureStages", "ventureGoals"]) {
      const labels = messages[group] as Record<string, string>;
      const hints = messages[`${group.replace(/s$/, "")}Hints`] as Record<string, string>;
      assert.deepEqual(
        Object.keys(hints).sort(),
        Object.keys(labels).sort(),
        `${locale}: ${group} und die Hinweise decken sich nicht`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Der Knopf, der nichts tat
// ---------------------------------------------------------------------------
test("nothing points at the dead anchor any more", () => {
  // /discovery#search landete im Modus "Entdecken", wo es den Anker gar nicht
  // gibt. Auf der Profilseite ist der Knopf inzwischen ganz weg; anderswo muss
  // der Modus mitgegeben werden, sonst faellt der Sprung wieder ins Leere.
  for (const file of [PAGE, "src/app/(product)/discovery/searches/page.tsx"]) {
    assert.doesNotMatch(source(file), /"\/discovery#search"/, `${file}`);
  }
  assert.match(
    source("src/app/(product)/discovery/searches/page.tsx"),
    /href="\/discovery\?mode=search#search"/,
    "dort, wo der Weg gebraucht wird, traegt er den Modus"
  );
});

test("people who are not ready yet get a way out, not a waiting room", () => {
  const page = source(PAGE);
  // Kein Link mehr, sondern ein Knopf, der erst speichert - der Weg bleibt.
  assert.match(page, /saveDraftAndLeave\.bind\(null, "\/connect\/problems"\)/);
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/discovery.json`);
    const intent = (messages.profile as Record<string, Record<string, string>>).intent;
    for (const key of ["connectBridgeTitle", "connectBridgeText", "connectBridgeCta"]) {
      assert.equal(typeof intent[key], "string", `${locale}: intent.${key} fehlt`);
    }
  }
});

// ---------------------------------------------------------------------------
// Kein Weg aus dem Formular, der Eingaben verwirft
// ---------------------------------------------------------------------------
test("no navigation link sits inside the unsaved form", () => {
  const page = source(PAGE);
  const start = page.indexOf("<form action={saveProfileDraft}");
  const end = page.indexOf("</form>", start);
  assert.ok(start > -1 && end > start);
  const form = page.slice(start, end);

  // Ein Link mitten im Formular verwirft alles, was noch nicht gespeichert
  // ist - lautlos. Die Stelle im Dokument aendert daran nichts; nur
  // "erst speichern, dann gehen" tut es.
  assert.doesNotMatch(form, /<Link\s/, "Wege aus dem Formular speichern erst");
});

test("the two remaining ways out save the draft first", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /async function saveDraftAndLeave\(target: string, formData: FormData\)/);
  assert.match(page, /saveDraftAndLeave\.bind\(null, "\/profile\?next=\/discovery\/profile"\)/);
  assert.match(page, /saveDraftAndLeave\.bind\(null, "\/connect\/problems"\)/);

  // Ohne Pflichtfeldpruefung: Ein Entwurf darf unvollstaendig sein, sonst
  // saesse jemand fest, der "Anderer Schwerpunkt" angekreuzt und den Text
  // noch nicht geschrieben hat.
  assert.equal((page.match(/formNoValidate/g) ?? []).length, 2);

  // Und die Beschriftung sagt, was passiert - statt es zu verschweigen.
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/discovery.json`);
    const profile = messages.profile as Record<string, Record<string, string>>;
    assert.match(profile.publicProfile.identityLink, /Speichern und|Save and/);
    assert.match(profile.intent.connectBridgeCta, /Speichern und|Save and/);
  }
});

test("saving a draft never un-publishes an active profile", () => {
  // Der Weg "erst speichern, dann gehen" laeuft ueber die Entwurfsaktion -
  // bei einem sichtbaren Profil darf das nicht heissen, es verschwindet.
  const actions = codeOnly("src/features/discovery/discoveryActions.ts");
  assert.match(actions, /const keepPublished = existing\?\.status === "active"/);
  assert.match(actions, /status: keepPublished \? "active" : "draft"/);
});

test("the pointless button next to the seeking roles is gone", () => {
  const page = source(PAGE);
  assert.doesNotMatch(page, /editPrivateSearch/);
  // Der erklaerende Satz bleibt - er war der nuetzliche Teil.
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/discovery.json`);
    const seeking = (messages.profile as Record<string, Record<string, string>>).seeking;
    assert.equal(seeking.editPrivateSearch, undefined, `${locale}: Schluessel ist weg`);
    assert.match(seeking.description, /privat|private/);
  }
});
