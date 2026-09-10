import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  APPLICATION_LEVELS,
  OWNERSHIP_WISHES,
  SNAPSHOT_STEPS,
  groupEntriesByFamily,
  isSnapshotStep,
  parseApplicationLevel,
  parseOwnershipWish,
  type CapabilityArea,
  type CapabilityEntry,
  type CapabilityFamily,
} from "@/features/capability/capabilityTypes";

const source = (path: string) => readFileSync(path, "utf8");

const families: CapabilityFamily[] = [
  { family_id: "commercial_growth", sort_order: 5 },
  { family_id: "product_value", sort_order: 2 },
  { family_id: "legal_governance", sort_order: 8 },
];
const areas: CapabilityArea[] = [
  { area_id: "product_management", family_id: "product_value", sort_order: 2 },
  { area_id: "product_discovery", family_id: "product_value", sort_order: 1 },
  { area_id: "b2b_sales", family_id: "commercial_growth", sort_order: 1 },
];
const entry = (areaId: string, over: Partial<CapabilityEntry> = {}): CapabilityEntry => ({
  id: `entry-${areaId}`,
  area_id: areaId,
  application_level: null,
  ownership_wish: null,
  evidence: [],
  ...over,
});

// ---------------------------------------------------------------------------
// Eingabepruefung
// ---------------------------------------------------------------------------
test("levels and ownership wishes only accept documented values", () => {
  assert.deepEqual([...APPLICATION_LEVELS], [1, 2, 3, 4, 5]);
  assert.equal(parseApplicationLevel("3"), 3);
  assert.equal(parseApplicationLevel("0"), null, "es gibt keine Stufe 0");
  assert.equal(parseApplicationLevel("6"), null);
  assert.equal(parseApplicationLevel(""), null, "leer bleibt leer statt Stufe 1");
  assert.equal(parseApplicationLevel(null), null);

  assert.equal(parseOwnershipWish("prefer_other"), "prefer_other");
  assert.equal(parseOwnershipWish("vielleicht"), null);
  assert.equal(parseOwnershipWish(""), null, "kein Default-Ownership-Wunsch");
});

test("only the three snapshot steps are routable", () => {
  assert.deepEqual([...SNAPSHOT_STEPS], ["evidence", "areas", "ownership"]);
  assert.ok(isSnapshotStep("areas"));
  assert.equal(isSnapshotStep("summary"), false);
  assert.equal(isSnapshotStep(undefined), false);
});

// ---------------------------------------------------------------------------
// Gruppierung
// ---------------------------------------------------------------------------
test("entries group by family in vocabulary order and empty families disappear", () => {
  const grouped = groupEntriesByFamily(
    [entry("b2b_sales"), entry("product_management"), entry("product_discovery")],
    areas,
    families
  );
  assert.deepEqual(
    grouped.map((group) => group.familyId),
    ["product_value", "commercial_growth"],
    "Familien nach sort_order, legal_governance ohne Eintrag entfaellt"
  );
  assert.deepEqual(
    grouped[0].entries.map((item) => item.area_id),
    ["product_discovery", "product_management"],
    "Bereiche innerhalb der Familie in Vokabularreihenfolge"
  );
});

test("an entry for an unknown area is skipped rather than crashing the view", () => {
  const grouped = groupEntriesByFamily([entry("gibt_es_nicht"), entry("b2b_sales")], areas, families);
  assert.deepEqual(grouped.map((group) => group.familyId), ["commercial_growth"]);
});

// ---------------------------------------------------------------------------
// Vertraege im Code
// ---------------------------------------------------------------------------
test("the ownership wish list matches the database check constraint", () => {
  const migration = source("../supabase/migrations/20260907160000_create_capability_snapshot_v01.sql");
  const clause = migration.match(/ownership_wish in \(([\s\S]*?)\)/)?.[1] ?? "";
  const declared = (clause.match(/'[a-z_]+'/g) ?? []).map((value) => value.replaceAll("'", ""));
  assert.deepEqual(
    declared.slice().sort(),
    [...OWNERSHIP_WISHES].sort(),
    "TypeScript und Check-Constraint muessen dieselben Zustaende kennen"
  );
});

test("selecting away an area keeps a narrated proof", () => {
  const actions = source("src/features/capability/capabilityActions.ts");
  // Ein abgewaehlter Haken darf keinen erzaehlten Beleg vernichten.
  assert.match(actions, /person_capability_evidence \?\? \[\]\)\.length === 0/);
});

test("the snapshot never writes a level or an ownership wish on its own", () => {
  const actions = source("src/features/capability/capabilityActions.ts");
  assert.match(actions, /if \(level !== null\)/, "eine vorhandene Stufe wird nur bei Angabe ueberschrieben");
  assert.doesNotMatch(actions, /application_level: 1\b/, "kein Default auf die niedrigste Stufe");
  assert.doesNotMatch(actions, /ownership_wish: "unclear"/, "kein Default-Ownership-Wunsch");
});

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------
test("the profile page is member-only, uncrawlable and inside the product shell", () => {
  const page = source("src/app/(product)/profile/page.tsx");
  assert.match(page, /redirect\("\/login\?next=\/profile"\)/, "ohne Login kein Profil");

  const robots = source("src/app/robots.ts");
  assert.match(robots, /"\/profile"/, "das Profil gehoert nicht in den Index");

  const chrome = source("src/features/navigation/productChromePath.ts");
  assert.match(chrome, /pathname === "\/profile"/, "die Seite braucht die Produkt-Navigation");
});

test("the ownership step asks the negation, not the affirmation", () => {
  const de = JSON.parse(source("messages/de/capability.json"));
  const en = JSON.parse(source("messages/en/capability.json"));
  assert.match(de.ownership.title, /nicht dauerhaft verantworten/);
  assert.match(en.ownership.title, /not want to own/);
});

test("the result view says that a gap may only be a missing entry", () => {
  const de = JSON.parse(source("messages/de/capability.json"));
  const en = JSON.parse(source("messages/en/capability.json"));
  // Kapitel 12 des Briefs, Regel 2: Unvollstaendigkeit immer mitsagen.
  assert.match(de.summary.incompleteNote, /noch nicht eingetragen/);
  assert.match(en.summary.incompleteNote, /not entered it yet/);
});

test("German and English capability messages are key-parallel", () => {
  const flatten = (value: unknown, prefix = ""): string[] =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
          flatten(nested, prefix ? `${prefix}.${key}` : key)
        )
      : [prefix];
  const de = flatten(JSON.parse(source("messages/de/capability.json"))).sort();
  const en = flatten(JSON.parse(source("messages/en/capability.json"))).sort();
  assert.deepEqual(de, en);
});

test("every area and family in the migration has a label in both locales", () => {
  const migration = source("../supabase/migrations/20260907160000_create_capability_snapshot_v01.sql");
  const de = JSON.parse(source("messages/de/capability.json"));
  const en = JSON.parse(source("messages/en/capability.json"));

  const areaBlock = migration.split("insert into public.capability_areas")[1] ?? "";
  const areaIds = [...new Set((areaBlock.match(/\('([a-z_0-9]+)', '[a-z_]+', \d+\)/g) ?? []).map((row) => row.split("'")[1]))];
  assert.ok(areaIds.length >= 42, `nur ${areaIds.length} Bereiche aus der Migration gelesen`);

  for (const areaId of areaIds) {
    assert.ok(de.areaLabels[areaId], `DE-Label fehlt fuer ${areaId}`);
    assert.ok(en.areaLabels[areaId], `EN-Label fehlt fuer ${areaId}`);
  }

  const familyIds = [...new Set((migration.match(/\('([a-z_]+)', \d+\)/g) ?? []).map((row) => row.split("'")[1]))];
  for (const familyId of familyIds) {
    assert.ok(de.families[familyId], `DE-Label fehlt fuer Familie ${familyId}`);
    assert.ok(en.families[familyId], `EN-Label fehlt fuer Familie ${familyId}`);
  }
});

test("query parameters are validated before they reach the translator", () => {
  const page = source("src/app/(product)/profile/page.tsx");
  const de = JSON.parse(source("messages/de/capability.json"));

  // next-intl wirft bei einem fehlenden Schluessel. Ungeprueft weitergegebene
  // Query-Parameter wuerden die Seite dadurch mit einem 500 beenden.
  assert.match(page, /SAVED_KEYS\.includes/);
  assert.match(page, /ERROR_KEYS\.includes/);
  assert.doesNotMatch(page, /t\(`success\.\$\{params\.saved\}`\)/);
  assert.doesNotMatch(page, /t\(`errors\.\$\{params\.error\}`\)/);

  const savedKeys = (page.match(/const SAVED_KEYS = \[([^\]]*)\]/)?.[1] ?? "")
    .split(",")
    .map((value) => value.trim().replaceAll('"', ""))
    .filter(Boolean);
  const errorKeys = (page.match(/const ERROR_KEYS = \[([^\]]*)\]/)?.[1] ?? "")
    .split(",")
    .map((value) => value.trim().replaceAll('"', ""))
    .filter(Boolean);

  assert.deepEqual(savedKeys.slice().sort(), Object.keys(de.success).sort());
  assert.deepEqual(errorKeys.slice().sort(), Object.keys(de.errors).sort());

  // Dasselbe fuer den Hinweis-Parameter, der mit der Analyse dazukam.
  assert.match(page, /NOTICE_KEYS\.includes/);
  const noticeKeys = (page.match(/const NOTICE_KEYS = \[([^\]]*)\]/)?.[1] ?? "")
    .split(",")
    .map((value) => value.trim().replaceAll('"', ""))
    .filter(Boolean);
  assert.deepEqual(noticeKeys.slice().sort(), Object.keys(de.notices).sort());
});

// ---------------------------------------------------------------------------
// Ein Ort statt drei
// ---------------------------------------------------------------------------
test("identity is edited in the core only, and reaches the context rows from there", () => {
  const actions = source("src/features/profile/personCoreActions.ts");
  const propagation = source(
    "../supabase/migrations/20260907180000_propagate_person_core_to_context_rows.sql"
  );

  // Der Editor schreibt ausschliesslich den Kern. Wuerde er zusaetzlich in die
  // Kontextzeilen schreiben, waere die Doppelpflege nur verlagert.
  assert.match(actions, /from\("person_core"\)/);
  assert.doesNotMatch(actions, /from\("network_profiles"\)/);
  assert.doesNotMatch(actions, /from\("founder_discovery_profiles"\)/);

  // profiles wird genau einmal angefasst, und zwar nur fuer roles. Rollen sind
  // keine Identitaet, sondern Zugehoerigkeit - die traegt der Kern absichtlich
  // nicht. Wuerde hier ein Identitaetsfeld mitgeschrieben, waere die
  // Doppelpflege zurueck, deshalb wird der Aufruf selbst geprueft und nicht
  // nur sein Vorkommen.
  const profilesWrites = actions.match(/from\("profiles"\)[^;]*/g) ?? [];
  assert.equal(profilesWrites.length, 1, "profiles darf nur an einer Stelle geschrieben werden");
  assert.match(profilesWrites[0], /\.update\(\{ roles \}\)/);
  for (const identityField of [
    "display_name",
    "headline",
    "bio",
    "location_region",
    "remote_mode",
    "expertise",
    "industries",
  ]) {
    assert.doesNotMatch(
      profilesWrites[0],
      new RegExp(identityField),
      `${identityField} gehoert in den Kern, nicht nach profiles`
    );
  }

  // Die Verteilung ist die Gegenrichtung zum Sync aus Phase 2 und braucht
  // deshalb einen Schleifenschutz.
  assert.match(propagation, /pg_trigger_depth\(\) > 1/);
  // Leere Kernwerte duerfen Kontextwerte nicht loeschen.
  assert.match(propagation, /coalesce\(new\.display_name, target\.display_name\)/);
  // Und die Veroeffentlichungsentscheidung bleibt unberuehrt.
  assert.doesNotMatch(propagation, /set[\s\S]{0,400}(visibility|published_at|public_slug|status) =/);
});

test("an empty field clears nothing, in code as in the trigger", () => {
  const actions = source("src/features/profile/personCoreActions.ts");
  // parseList und parseText geben null zurueck, nicht "" oder []. Ein leeres
  // Array wuerde bei der Verteilung die Kontextwerte ueberschreiben.
  assert.match(actions, /return items\.length \? items : null/);
  assert.match(actions, /if \(!text\) return null/);
});

test("the publication conflict has its own message instead of a generic save error", () => {
  const actions = source("src/features/profile/personCoreActions.ts");
  const de = JSON.parse(source("messages/de/capability.json"));
  const en = JSON.parse(source("messages/en/capability.json"));

  assert.match(actions, /active_complete/, "der Konflikt muss erkannt werden");
  assert.match(actions, /published_incomplete/);
  assert.ok(de.errors.published_incomplete, "DE-Meldung fehlt");
  assert.ok(en.errors.published_incomplete, "EN-Meldung fehlt");
  // Die Meldung muss den Ausweg nennen, nicht nur das Problem.
  assert.match(de.errors.published_incomplete, /Entwurf/);
  assert.match(en.errors.published_incomplete, /draft/);
});

test("the Connect profile page no longer maintains identity itself", () => {
  const page = source("src/app/(product)/connect/profile/page.tsx");
  const validation = source("src/features/connect/connectValidation.ts");
  const actions = source("src/features/connect/connectActions.ts");

  // Die Doppelpflege ist beendet: keine Identitaetseingaben mehr auf dieser
  // Seite, nur noch das Kontextspezifische.
  for (const removed of ["display_name", "headline", "bio", "expertise", "industries", "location_region", "remote_mode"]) {
    assert.doesNotMatch(page, new RegExp(`name="${removed}"`), `${removed} wird hier noch gepflegt`);
  }
  // Was hier bleibt, gehoert hierher.
  assert.match(page, /name="network_roles"/);
  assert.match(page, /ConnectVisibilityField/);
  assert.match(page, /ConnectPhotoField/);
  // Und ein Weg zum einen Ort.
  assert.match(page, /href="\/profile"/);

  // Der Parser bekommt die Identitaet, statt sie aus dem Formular zu lesen.
  assert.match(validation, /parseConnectProfile\(formData: FormData, identity: ConnectIdentitySource \| null\)/);
  assert.doesNotMatch(validation, /display_name: text\(formData/);
  assert.match(actions, /getPersonCore\(client, user\.id\)/);
});

test("the Discovery profile page no longer maintains identity either", () => {
  const page = source("src/app/(product)/discovery/profile/page.tsx");
  const actions = source("src/features/discovery/discoveryActions.ts");

  for (const removed of ["displayName", "headline", "bio", "expertise", "industries", "locationRegion", "remoteMode"]) {
    assert.doesNotMatch(page, new RegExp(`name="${removed}"`), `${removed} wird hier noch gepflegt`);
  }
  // Was hier bleibt, ist kontextspezifisch und hat im Kern keine Entsprechung.
  for (const kept of ["ownRoles", "seekingRoles", "availabilityHoursPerWeek", "commitmentLevel", "ventureStage", "ventureGoal", "searchIntent", "startHorizon"]) {
    assert.match(page, new RegExp(`name="${kept}"`), `${kept} gehoert hierher und fehlt`);
  }
  assert.match(page, /href="\/profile"/);

  // Der Parser bekommt die Identitaet, statt sie aus dem Formular zu lesen.
  assert.match(actions, /parseDiscoveryProfileFormData\(\s*formData: FormData,\s*identity: PersonCore \| null/);
  assert.match(actions, /displayName: identity\?\.display_name/);
  assert.doesNotMatch(actions, /displayName: getFirstString/);
  assert.match(actions, /getPersonCore\(client, userId\)/);
});

test("both context pages keep their own publication decision", () => {
  const connect = source("src/app/(product)/connect/profile/page.tsx");
  const discovery = source("src/app/(product)/discovery/profile/page.tsx");
  // Der Kern aendert Inhalte, nie die Entscheidung, sie zu zeigen - also muss
  // jede Kontextseite ihren Veroeffentlichungsschalter behalten.
  assert.match(connect, /ConnectVisibilityField/);
  assert.match(discovery, /publishResult|publishProfile|saveProfileDraft/);
});

test("/profile is reachable from the dashboard and the account menu", () => {
  const dashboard = source("src/app/(product)/dashboard/page.tsx");
  const shell = source("src/features/navigation/ProductShell.tsx");

  assert.match(shell, /href="\/profile"/, "das Kontomenue muss dorthin fuehren");
  assert.match(dashboard, /href="\/profile"/, "das Dashboard ist der zentrale Anlaufpunkt");

  // Der Erststart bleibt im Dashboard eingebettet - ein Einstieg ist etwas
  // anderes als ein Editor. Danach ist der Block nur noch ein Eingang.
  assert.match(dashboard, /needsOnboarding \? \(\s*<ProfileBasicsForm/);
  assert.doesNotMatch(dashboard, /mode=\{needsOnboarding \? "onboarding" : "edit"\}/);
});

test("the menu bar shows the chosen picture, with initials as the fallback", () => {
  const shell = source("src/features/navigation/ProductShell.tsx");
  const layout = source("src/app/layout.tsx");
  const reader = source("src/features/profile/profileData.ts");

  // Keine zweite Auflösungskette: ProfileAvatar entscheidet selbst, ob die
  // Bibliotheks-Illustration oder der eigene Upload gewinnt, und faellt sonst
  // auf Initialen zurueck. Genau diese Komponente nutzt auch das Dashboard.
  assert.match(shell, /<ProfileAvatar/);
  assert.match(shell, /avatarId=\{avatarId\}/);
  assert.match(shell, /imageUrl=\{avatarImageUrl\}/);
  assert.match(shell, /fallbackClassName=/, "die Initialen bleiben als Rueckfall");
  assert.doesNotMatch(shell, /const avatarLabel/, "der einzelne Buchstabe ist ersetzt");

  assert.match(layout, /getOwnProfileImage\(supabase, user\.id\)/);
  // Die Abfrage holt nur das Bild, nicht die ganze Profilzeile.
  assert.match(reader, /select\("avatar_id,avatar_url"\)/);
});

test("uploaded photos are no longer reachable without a session", () => {
  const migration = source("../supabase/migrations/20260907220000_make_avatar_bucket_private.sql");
  const avatar = source("src/features/profile/ProfileAvatar.tsx");
  const route = source("src/app/api/profile/photo/[...path]/route.ts");

  // Der Bucket war public = true mit einer Policy ohne Rolleneinschraenkung.
  assert.match(migration, /update storage\.buckets set public = false where id = 'avatars'/);
  assert.match(migration, /drop policy if exists avatars_public_read/);
  assert.match(migration, /to authenticated/);
  // Bestandsdateien bleiben liegen - kein Umzug, kein Wertwechsel.
  assert.doesNotMatch(migration, /update public\.profiles|delete from storage\.objects/);

  // Kein Rendern mehr ueber eine oeffentliche Storage-URL.
  assert.doesNotMatch(avatar, /object\/public/);
  assert.match(avatar, /\/api\/profile\/photo\//);

  // Die Route verlangt eine Sitzung und braucht keinen Service-Role-Schluessel,
  // schafft also keinen neuen privilegierten Pfad.
  assert.match(route, /if \(!user\) return new NextResponse\(null, \{ status: 404 \}\)/);
  assert.doesNotMatch(route, /SERVICE_ROLE/);
  assert.match(route, /X-Robots-Tag/);
  // Nur das Bucket-Layout ist erlaubt, kein beliebiger Pfad.
  assert.match(route, /PATH_PATTERN\.test\(objectPath\)/);

  // Und nicht ueber next/image: der Optimierer holt die Datei serverseitig
  // ohne Sitzungs-Cookies, bekommt vom geschuetzten Endpunkt eine 404 und
  // liefert ein leeres Bild. Genau das ist beim ersten Deploy passiert.
  assert.match(avatar, /resolvedSrc\.startsWith\(PHOTO_ROUTE_PREFIX\)/);
});

// ---------------------------------------------------------------------------
// Freigabe
// ---------------------------------------------------------------------------
test("the disclosure ladder is three rungs, closed by default, and offers no narrative rung", () => {
  const migration = source("../supabase/migrations/20260908120000_create_capability_disclosure_v01.sql");
  const de = JSON.parse(source("messages/de/capability.json"));

  assert.match(migration, /capability_disclosure text not null default 'private'/);
  assert.match(migration, /'private', 'areas', 'areas_depth_on_contact'/);
  // Kein Feld und kein Text fuer eine Belegfreigabe - eine Stufe, die niemand
  // waehlen sollte, wird nicht angeboten.
  assert.equal(de.disclosure.evidence, undefined);
  assert.match(de.disclosure.note, /Belege werden nie weitergegeben/);

  // Und die Freigabe ist ausdruecklich nicht fuer anon - `revoke from public`
  // allein genuegt bei Supabase-Default-Privilegien nicht.
  assert.match(migration, /revoke all on function public\.get_disclosed_capability\(uuid, text\) from anon/);
  assert.doesNotMatch(migration, /to anon/);
});

test("a withheld depth is indistinguishable from a missing one", () => {
  const migration = source("../supabase/migrations/20260908120000_create_capability_disclosure_v01.sql");
  const view = source("src/features/capability/DisclosedCapability.tsx");

  // Die Tiefe kommt als null zurueck statt als eigener Fall - sonst waere die
  // Zurueckhaltung selbst eine Aussage.
  assert.match(migration, /case when eligible\.capability_disclosure = 'areas_depth_on_contact' and eligible\.connected/);

  // Und wer nichts freigegeben hat, erzeugt keinen Block: kein "keine
  // Angaben", kein Platzhalter. Ein sichtbarer Leerplatz macht aus einem
  // fehlenden Eintrag eine Aussage.
  assert.match(view, /if \(rows\.length === 0\) return null/);
  assert.doesNotMatch(view, /noEntries|empty/);
});

test("the disclosed block appears on both context pages but never on a public one", () => {
  for (const page of [
    "src/app/(product)/discovery/[profileId]/page.tsx",
    "src/app/(product)/connect/listings/[listingId]/page.tsx",
  ]) {
    const body = source(page);
    assert.match(body, /<DisclosedCapability/, `${page} zeigt den Block nicht`);
    // Beim eigenen Profil wird gar nicht gefragt.
    assert.match(body, /(isOwner|own)\s*\?\s*\[\]/, `${page} fragt auch beim eigenen Eintrag`);
  }

  for (const publicPage of [
    "src/app/(public-connect)/connect/p/[publicSlug]/page.tsx",
    "src/app/(public-connect)/connect/l/[publicSlug]/page.tsx",
  ]) {
    const body = source(publicPage);
    assert.doesNotMatch(body, /DisclosedCapability|get_disclosed_capability/,
      `${publicPage} darf keine Capability zeigen`);
  }
});

test("the first step no longer asks the person to classify", () => {
  const start = source("src/features/capability/CapabilitySnapshotStart.tsx");
  const actions = source("src/features/capability/capabilityActions.ts");
  const de = JSON.parse(source("messages/de/capability.json"));

  // Kein Bereichsfeld in der Erzaehl-Phase: erzaehlen, nicht einordnen. Der
  // area_id-Haken kommt erst in der Bestaetigung, und dort mit Begruendung -
  // deshalb ist die Pruefung auf die erste Phase eingegrenzt.
  // Die Erzaehl-Phase ist das letzte return - die Bestaetigung kehrt vorher
  // zurueck, und in der gehoert area_id hin.
  const writePhase = start.slice(start.lastIndexOf("return ("));
  assert.ok(writePhase.length > 0, "die Erzaehl-Phase wurde nicht gefunden");
  assert.doesNotMatch(writePhase, /name="area_id"/);
  assert.match(writePhase, /name="narrative"/);
  assert.equal(de.evidence.areaLabel, undefined, "die alten Auswahltexte sind weg");
  assert.ok(de.evidence.assignmentNote, "stattdessen der Hinweis, dass zugeordnet wird");

  // Das System ordnet zu, und zwar ueber die auswechselbare Schnittstelle -
  // im Browser vor der Rueckfrage, auf dem Server nur ohne JavaScript.
  assert.match(start, /analyzeNarrativeWithRules\(\{ narrative, locale: "de" \}\)/);
  assert.match(actions, /analyzeNarrativeWithRules\(\{ narrative, locale: "de" \}\)/);
  // Bleibt nichts uebrig, geht die Erzaehlung in den Auffangwert statt verloren.
  assert.match(actions, /recognised\.length \? recognised : \["other"\]/);
  // Und der Nutzer erfaehrt, welcher Fall eingetreten ist.
  assert.match(actions, /recognised\.length \? \(confirmed \? "confirmed" : "recognised"\) : "unmatched"/);
});

test("the analysis interface is swappable and says which engine ran", () => {
  const analyzer = source("src/features/capability/narrativeAnalysis.ts");
  // Der Platz fuer eine abgeleitete Staerke ist vorbereitet, bleibt bei den
  // Regeln aber leer - eine Auswahlliste waere soziale Erwuenschtheit ohne
  // Gegengewicht und muesste spaeter wieder weichen.
  assert.match(analyzer, /strength: string \| null/);
  assert.match(analyzer, /engine: "rules" \| "model"/);
  assert.match(analyzer, /strength: null/);
  // Jeder Vorschlag traegt seine Begruendung mit.
  assert.match(analyzer, /matchedTerms: string\[\]/);
});
