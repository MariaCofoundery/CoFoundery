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

/**
 * SQL ohne Kommentare.
 *
 * Fuer Pruefungen der Form "das darf nicht vorkommen": Der Kommentar erklaert
 * oft gerade, WARUM etwas fehlt, und wuerde die Pruefung selbst erfuellen.
 */
const sqlWithoutComments = (path: string) =>
  source(path)
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");

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
  // Die Bedingung steht in der Karte: Das Feld klappt genau dort auf, wo
  // angekreuzt wurde - nicht darunter im Freien.
  assert.match(field, /const expands = option\.value === "other" && checked/);
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
  assert.match(field, /copy\.counterByCount\[selected\.length\]/);
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

test("every option of the three choices explains itself", () => {
  const page = codeOnly(PAGE);
  // Die Erklaerung haengt an der Option, nicht als fester Absatz unter dem
  // Feld: Drei solche Bloecke uebereinander schuetteten die Seite zu.
  for (const group of ["commitmentLevelHints", "ventureStageHints", "ventureGoalHints"]) {
    assert.match(page, new RegExp(`hint: t\\(\`${group}\\.`));
  }

  const field = codeOnly("src/features/discovery/DiscoveryChoiceField.tsx");
  assert.match(field, /role="tooltip"/);
  // Absolut und ohne Zeigerereignisse: verschiebt nichts, faengt keinen Klick.
  assert.match(field, /pointer-events-none invisible absolute/);
  // Sichtbar beim Zeigen UND beim Fokus - auf dem Telefon gibt es kein Zeigen.
  assert.match(field, /group-hover:visible/);
  assert.match(field, /peer-focus-visible:visible/);
  // Und fuer eine Vorlesesoftware ohnehin verbunden.
  assert.match(field, /aria-describedby=\{`\$\{id\}-hint`\}/);

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

// ---------------------------------------------------------------------------
// Nichts Unserialisierbares ueber die Server-Client-Grenze
// ---------------------------------------------------------------------------
test("the role field receives ready-made strings, never a function", () => {
  const field = source(ROLE_FIELD);
  assert.match(field, /^"use client";/, "die Komponente laeuft im Browser");

  // Eine Funktion ueber diese Grenze laesst React nicht zu: Die Seite wirft
  // beim Rendern und zeigt nur noch "a server-side exception has occurred".
  // Genau das ist in der Fassung vom 17.09.2026 passiert.
  const copyType = field.slice(field.indexOf("type Copy = {"), field.indexOf("};", field.indexOf("type Copy = {")));
  assert.doesNotMatch(copyType, /=>/, "kein Prop dieser Komponente ist eine Funktion");
  assert.match(copyType, /counterByCount: string\[\];/);

  const page = codeOnly(PAGE);
  assert.doesNotMatch(page, /counter: \(selected, max\) =>/);
  assert.match(page, /counterByCount: countLabels\(t, DISCOVERY_SELECTION_LIMITS\.ownRoles\)/);
  assert.match(page, /counterByCount: countLabels\(t, DISCOVERY_SELECTION_LIMITS\.seekingRoles\)/);
});

test("the prepared strings cover every possible count", () => {
  const page = codeOnly(PAGE);
  // Von null bis zur Obergrenze, sonst stuende beim letzten Ankreuzen nichts
  // da - der Index ist die Anzahl.
  assert.match(page, /Array\.from\(\{ length: max \+ 1 \}/);
});

test("the free text opens inside the card it belongs to", () => {
  const field = source(ROLE_FIELD);
  // Die Karte ist ein div, nicht das label: Sonst schaltete ein Klick in das
  // Textfeld das Ankreuzfeld um, weil das label der Rolle gilt.
  const cardStart = field.indexOf("const expands =");
  const inputAt = field.indexOf("name={otherName}");
  assert.ok(cardStart > -1 && inputAt > cardStart, "das Feld liegt in der Karte");

  // Und es bekommt den Fokus, damit man nicht sucht, wo man tippen soll.
  assert.match(field, /name=\{otherName\}\s*\n\s*required\s*\n\s*autoFocus/);
  // Ueber die volle Breite, sonst quetscht sich der Satz in ein Drittel.
  assert.match(field, /expands \? "sm:col-span-2 lg:col-span-3" : ""/);
});

test("the three choices stack instead of sitting in three columns", () => {
  const page = codeOnly(PAGE);
  // Die Antworten sind Saetze, keine Stichwoerter - nebeneinander brachen sie
  // um und die Spalten wurden ungleich hoch.
  assert.doesNotMatch(page, /grid gap-5 md:grid-cols-3/);
  assert.match(page, /<legend className=\{LABEL_CLASS\}>\{t\("profile\.venture\.commitment"\)\}/);
});

test("the three permanent hint paragraphs are gone", () => {
  const page = codeOnly(PAGE);
  for (const key of ["commitmentHelp", "stageHelp", "goalHelp"]) {
    assert.doesNotMatch(page, new RegExp(`venture\\.${key}`), `${key} steht nicht mehr fest da`);
  }
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/discovery.json`);
    const venture = (messages.profile as Record<string, Record<string, string>>).venture;
    for (const key of ["commitmentHelp", "stageHelp", "goalHelp"]) {
      assert.equal(venture[key], undefined, `${locale}: ${key} ist auch aus der Copy weg`);
    }
  }
});

// ---------------------------------------------------------------------------
// Die Alignment-Dimensionen erscheinen erst auf Wunsch
// ---------------------------------------------------------------------------
const ALIGNMENT_EDITOR = "src/features/discovery/DiscoveryAlignmentPreferencesEditor.tsx";

test("the six dimensions appear only once the box is ticked", () => {
  const editor = codeOnly(ALIGNMENT_EDITOR);
  assert.match(editor, /const \[enabled, setEnabled\] = useState\(initialEnabled\)/);
  assert.match(editor, /\{!enabled \? null : \(/);

  // Das Haekchen steht jetzt in derselben Komponente wie das, was es
  // hervorruft - getrennt haette die Seite einen Zustand fuehren muessen,
  // den nur diese Komponente braucht.
  assert.match(editor, /name="discoveryV2AlignmentEnabled"/);
  const page = codeOnly(PAGE);
  assert.doesNotMatch(page, /name="discoveryV2AlignmentEnabled"/);
  assert.match(page, /initialEnabled=\{loadedPreferences\?\.discoveryV2AlignmentEnabled/);
});

test("switching alignment off does not forget the chosen dimensions", () => {
  const actions = codeOnly("src/features/discovery/discoveryActions.ts");
  // Die Felder sind im abgeschalteten Zustand eingeklappt und kommen gar
  // nicht erst im Formular an. Ohne diese Fallunterscheidung loeschte jedes
  // Speichern die Auswahl, und beim Wiedereinschalten stuende alles auf
  // Anfang.
  assert.match(
    actions,
    /discoveryV2AlignmentPreferences: enabled\s*\n\s*\? parseDiscoveryV2AlignmentPreferences\(formData\)\s*\n\s*: existing\?\.discoveryV2AlignmentPreferences \?\? \{\}/
  );
});

// ---------------------------------------------------------------------------
// Obergrenze oder Jetzt-Stand
// ---------------------------------------------------------------------------
const AVAILABILITY_FIELD = "src/features/discovery/DiscoveryAvailabilityField.tsx";
const AVAILABILITY_MIGRATION =
  "../supabase/migrations/20260925120000_discovery_availability_flexibility.sql";

test("this is not a motivation scale", () => {
  // Eine Selbsteinschaetzung, bei der alle das Hoechste ankreuzen, traegt
  // keine Information - sie erzeugt nur Vergleich auf einer Achse, die sich
  // nicht messen laesst.
  const migration = sqlWithoutComments(AVAILABILITY_MIGRATION);
  assert.doesNotMatch(migration, /motivation|drive|enthusias/i);
  assert.match(migration, /availability_flexibility in \('fixed', 'would_expand'\)/);

  const field = codeOnly(AVAILABILITY_FIELD);
  assert.doesNotMatch(field, /type="range"|1-5|stars?\b/i, "keine Skala, keine Sterne");
});

test("both answers are offered as respectable", () => {
  // Die Frage funktioniert nur, wenn keine der beiden Antworten die bessere
  // ist. Steht das nicht in den Hinweisen, kreuzen alle dasselbe an.
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/discovery.json`);
    const publicProfile = (messages.profile as Record<string, Record<string, unknown>>)
      .publicProfile;
    const hints = publicProfile.availabilityFlexHints as Record<string, string>;
    const options = publicProfile.availabilityFlexOptions as Record<string, string>;
    assert.deepEqual(Object.keys(options).sort(), ["fixed", "would_expand"]);
    assert.deepEqual(Object.keys(hints).sort(), ["fixed", "would_expand"]);
    assert.ok(hints.fixed.length > 40, `${locale}: "fixed" braucht eine echte Begruendung`);
  }
  const de = (
    (readJson("messages/de/discovery.json").profile as Record<string, Record<string, unknown>>)
      .publicProfile.availabilityFlexHints as Record<string, string>
  ).fixed;
  assert.match(de, /keine Absage/, "das Limit darf nicht wie ein Mangel klingen");
});

test("the promise costs a condition", () => {
  const migration = sqlWithoutComments(AVAILABILITY_MIGRATION);
  // "Ja, fuer das Richtige" ist billig. Die Bedingung ist der Inhalt - und sie
  // darf nur zusammen mit der Antwort dastehen, zu der sie gehoert.
  assert.match(migration, /availability_flexibility = 'would_expand'/);
  assert.match(migration, /char_length\(btrim\(availability_condition\)\) between 10 and 200/);

  const field = codeOnly(AVAILABILITY_FIELD);
  assert.match(field, /const expands = option\.value === "would_expand" && checked/);
  assert.match(field, /name="availabilityCondition"\s*\n\s*required/);

  const validation = codeOnly("src/features/discovery/discoveryValidation.ts");
  // Mit dem Abwaehlen faellt die Bedingung weg, statt unsichtbar stehen zu
  // bleiben - dieselbe Regel wie beim Freitext der Rollen.
  assert.match(
    validation,
    /flexibility === "would_expand" && conditionText\.length >= 10 \? conditionText : null/
  );
});

test("the answer stays optional", () => {
  const migration = sqlWithoutComments(AVAILABILITY_MIGRATION);
  assert.match(migration, /availability_flexibility is null\s*\n\s*or availability_flexibility in/);

  // Keine neue Veroeffentlichungshuerde: Bestandsprofile wuerden sonst
  // unsichtbar, und nicht jede Person kann die Frage heute beantworten.
  const issues = source("src/features/discovery/discoveryProfileFeedback.ts");
  assert.doesNotMatch(issues, /availabilityFlexibility|availabilityCondition/);
});

test("the qualifier is shown next to the hours, the condition only in full", () => {
  const card = source("src/features/discovery/FounderDiscoveryCard.tsx");
  assert.match(card, /availabilityFlexShort/);
  // Die Bedingung ist ein Satz zum Reden, kein Merkmal zum Ueberfliegen.
  assert.doesNotMatch(card, /availabilityCondition/);

  const detail = source("src/app/(product)/discovery/[profileId]/page.tsx");
  assert.match(detail, /availabilityFlexShort/);
  assert.match(detail, /profile\.availabilityCondition/);
});

// ---------------------------------------------------------------------------
// Der letzte Schritt
// ---------------------------------------------------------------------------
const RECENT_STEP_MIGRATION =
  "../supabase/migrations/20260926120000_discovery_recent_step.sql";

test("the last step cannot become a CV", () => {
  const migration = sqlWithoutComments(RECENT_STEP_MIGRATION);
  // 280 Zeichen sind kein Werdegang, und die Frage fragt nach DEM letzten
  // Schritt, in der Einzahl.
  assert.match(migration, /char_length\(btrim\(recent_step\)\) between 20 and 280/);

  const de = (readJson("messages/de/discovery.json").profile as Record<string, Record<string, string>>)
    .venture;
  assert.match(de.recentStepLabel, /letzter Schritt/);
  // Das Beispiel modelliert einen Schritt, keine Leistung - sonst schreiben
  // alle "taeglich drei Stunden am Pitch Deck".
  assert.match(de.recentStepPlaceholder, /gesprochen/);
});

test("an empty field is a valid answer, and says so", () => {
  const migration = sqlWithoutComments(RECENT_STEP_MIGRATION);
  assert.match(migration, /recent_step is null or/);

  // Keine Veroeffentlichungshuerde - wer nichts geschafft hat, faellt hier
  // nicht durch.
  const issues = source("src/features/discovery/discoveryProfileFeedback.ts");
  assert.doesNotMatch(issues, /recentStep/);

  for (const locale of ["de", "en"]) {
    const venture = (readJson(`messages/${locale}/discovery.json`).profile as Record<string, Record<string, string>>)
      .venture;
    assert.match(venture.recentStepHint, /Freiwillig|Optional/);
  }
  const de = (readJson("messages/de/discovery.json").profile as Record<string, Record<string, string>>)
    .venture;
  // Der Hinweis muss die Scham wegnehmen, sonst schreibt jemand etwas hin,
  // nur um nicht leer dazustehen.
  assert.match(de.recentStepHint, /nicht weniger ernst/);
  assert.match(de.recentStepHint, /Absage|verworfener/);
});

test("the last step is read on the profile, never scanned on a card", () => {
  const detail = source("src/app/(product)/discovery/[profileId]/page.tsx");
  assert.match(detail, /profile\.recentStep/);

  const card = source("src/features/discovery/FounderDiscoveryCard.tsx");
  assert.doesNotMatch(card, /recentStep/);

  // Und die Suchprojektion traegt ihn gar nicht erst - was nicht ankommt,
  // kann auch nicht versehentlich angezeigt werden. Die Abbildung der vollen
  // Tabellenzeile liest ihn sehr wohl; geprueft wird der Suchzeilentyp.
  const data = source("src/features/discovery/discoveryData.ts");
  const searchRowType = data.slice(
    data.indexOf("type DiscoveryV2SearchRow = {"),
    data.indexOf("};", data.indexOf("type DiscoveryV2SearchRow = {"))
  );
  assert.doesNotMatch(searchRowType, /recent_step/);
  assert.match(codeOnly("src/features/discovery/discoveryData.ts"), /recentStep: null,/);
});

// ---------------------------------------------------------------------------
// Erst lesen, dann entscheiden
// ---------------------------------------------------------------------------
test("the question comes after the profile, the status before it", () => {
  const page = source("src/app/(product)/discovery/[profileId]/page.tsx");

  // Die FRAGE "moechtest du diese Person kennenlernen" stand direkt unter dem
  // Kopf und verlangte eine Entscheidung, bevor irgendetwas gelesen war.
  const question = page.indexOf("isOwner || introRequest ? null : (");
  const content = page.indexOf("detail.sections.interests.eyebrow");
  assert.ok(question > -1 && content > -1);
  assert.ok(question > content, "die Frage steht hinter dem Inhalt");

  // Ein laufender oder beantworteter Stand ist dagegen eine Information und
  // bleibt oben.
  const status = page.indexOf("isOwner || !introRequest ? null : (");
  assert.ok(status > -1 && status < content, "der Stand bleibt vor dem Inhalt");
});

test("a foreign profile never speaks in the first person", () => {
  // Die Seite zeigt die Angaben EINER ANDEREN Person. "Woran ich interessiert
  // bin" las sich dort, als spraeche die Betrachterin ueber sich selbst.
  const FIRST_PERSON = /\b(ich|mein|meine|meinem|meinen)\b|\bI am\b|\bI'm\b|\bmy\b/i;
  for (const locale of ["de", "en"]) {
    const detail = (readJson(`messages/${locale}/discovery.json`).detail as Record<string, unknown>);
    const sections = detail.sections as Record<string, { eyebrow: string; title: string }>;
    for (const [key, section] of Object.entries(sections)) {
      assert.doesNotMatch(section.title, FIRST_PERSON, `${locale}: sections.${key}.title`);
      assert.doesNotMatch(section.eyebrow, FIRST_PERSON, `${locale}: sections.${key}.eyebrow`);
    }
    // Und die Ueberschrift darf nicht ihre eigene Kategorie wiederholen.
    for (const [key, section] of Object.entries(sections)) {
      assert.notEqual(
        section.title.toLowerCase(),
        section.eyebrow.toLowerCase(),
        `${locale}: sections.${key} sagt zweimal dasselbe`
      );
    }
  }

  // Der Bearbeiten-Knopf darf "mein" sagen - er erscheint nur der eigenen
  // Person.
  const page = source(PAGE.replace("profile/page.tsx", "[profileId]/page.tsx"));
  assert.match(page, /isOwner \? \([\s\S]{0,160}detail\.editOwn/);
});
