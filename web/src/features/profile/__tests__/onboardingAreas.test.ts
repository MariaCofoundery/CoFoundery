import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveProductEntryPath } from "@/features/auth/productEntry";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const FORM = "src/features/profile/ProfileBasicsForm.tsx";
const WELCOME = "src/app/welcome/page.tsx";
const START = "src/app/(product)/start/page.tsx";
const CONNECT_ACTION = "src/features/profile/onboardingActions.ts";
const ROLE_SAVE = "src/features/profile/personCoreActions.ts";
const MIGRATION = "../supabase/migrations/20260930120000_onboarding_areas_and_membership.sql";

const onboardingCopy = (locale: string) => {
  const messages = readJson(`messages/${locale}/profile.json`) as {
    basicsForm: { onboarding: Record<string, unknown> };
  };
  return messages.basicsForm.onboarding;
};

// ---------------------------------------------------------------------------
// Die Weiche
// ---------------------------------------------------------------------------
test("wer noch nicht eingefuehrt wurde, wird eingefuehrt - vor jeder anderen Weiche", () => {
  const cases = [
    { name: "ohne alles", hasFounder: false, hasAdvisor: false, hasConnect: false },
    { name: "nur Netzwerk", hasFounder: false, hasAdvisor: false, hasConnect: true },
    { name: "Founder", hasFounder: true, hasAdvisor: false, hasConnect: true },
    { name: "Advisor", hasFounder: false, hasAdvisor: true, hasConnect: true },
  ];

  for (const { name, ...capabilities } of cases) {
    assert.equal(
      resolveProductEntryPath(
        "/dashboard",
        { ...capabilities, coreProfileComplete: false, onboardingComplete: false },
        "/welcome"
      ),
      "/welcome",
      `${name}: bekommt keine Einfuehrung`
    );
  }
});

test("wer eingefuehrt wurde, bekommt den Einstieg nicht noch einmal", () => {
  // Der teurere Fehler: Eine Einfuehrung, die man ein zweites Mal bekommt,
  // ist keine Einfuehrung, sondern eine Sperre.
  assert.equal(
    resolveProductEntryPath(
      "/dashboard",
      { hasFounder: true, hasAdvisor: false, hasConnect: true, coreProfileComplete: true, onboardingComplete: true },
      "/welcome"
    ),
    "/dashboard"
  );

  // Und ohne Angabe gilt "war schon da" - ein Lesefehler darf niemanden
  // zurueckwerfen, der laengst drin ist.
  assert.equal(
    resolveProductEntryPath(
      "/connect",
      { hasFounder: false, hasAdvisor: false, hasConnect: true, coreProfileComplete: false, connectProfileReady: true },
      "/welcome"
    ),
    "/connect"
  );
});

test("die Einstiegsseite laesst niemanden ein zweites Mal hinein", () => {
  const page = source(WELCOME);
  assert.match(page, /onboarding_completed_at/);
  assert.match(page, /if \(core\?\.onboarding_completed_at\) \{\s*redirect\(nextPath\);/);
});

// ---------------------------------------------------------------------------
// Die Wahl
// ---------------------------------------------------------------------------
test("im Einstieg ist keine Antwort vorausgewaehlt", () => {
  const form = source(FORM);
  // Sonst wird jede Person, die durchklickt, Founderin - ohne es gewaehlt zu
  // haben, und mit Align und Find, die sie nie gesehen hat.
  assert.match(form, /mode === "onboarding" && !initialValues\.roles\?\.length \? "" : initialPlan/);
  // Und die Einstiegsseite belegt die Rollen nicht mehr vor.
  assert.doesNotMatch(source(WELCOME), /roles: profile\?\.roles \?\? \[profileIntent\]/);
});

test("der Weiter-Knopf bleibt gesperrt, bis jemand etwas gewaehlt hat", () => {
  const form = source(FORM);
  assert.match(form, /if \(step === "plan"\) \{\s*return values\.plan\.length === 0;/);
});

test("alle vier Wege stehen zur Wahl, in beiden Sprachen", () => {
  const form = source(FORM);
  assert.match(form, /ONBOARDING_PLANS: OnboardingPlan\[\] = \["founder", "advisor", "both", "connect"\]/);

  for (const locale of ["de", "en"]) {
    const plans = onboardingCopy(locale).plans as Record<string, { title?: string; description?: string }>;
    for (const plan of ["founder", "advisor", "both", "connect"]) {
      assert.ok(plans?.[plan]?.title, `${locale}: plans.${plan}.title fehlt`);
      assert.ok(plans?.[plan]?.description, `${locale}: plans.${plan}.description fehlt`);
    }
  }
});

// ---------------------------------------------------------------------------
// Was sich oeffnet - und was die Datenbank dazu sagt
// ---------------------------------------------------------------------------
test("die angezeigten Bereiche bilden ab, was die Datenbank tatsaechlich tut", () => {
  const form = source(FORM);

  // Der Trigger ensure_network_membership_for_product_role macht jede
  // Founderin UND jeden Advisor zum Netzwerkmitglied. Stuende Connect bei
  // einer der beiden Wahlen nicht dabei, versprächen wir weniger, als die
  // Person bekommt - und sie suchte einen Bereich nicht, den sie hat.
  assert.match(form, /if \(plan === "connect"\) return \["connect"\];/);
  assert.match(form, /if \(plan === "advisor"\) return \["align", "connect"\];/);
  assert.match(form, /return \["align", "find", "connect"\];/);

  const trigger = source("../supabase/migrations/20260903180000_create_network_v01_slice1.sql");
  assert.match(
    trigger,
    /if new\.roles && array\['founder', 'advisor'\]::text\[\] then/,
    "die Grundlage der Zuordnung hat sich geaendert - areasForPlan pruefen"
  );

  // Find haengt an hasFounder. Deshalb ist die Frage "was hast du vor" und
  // nicht "waehle deine Bereiche": Find ohne Align gibt es nicht.
  assert.match(
    source("src/features/navigation/ProductShell.tsx"),
    /\{hasFounder \? \([\s\S]{0,200}href="\/discovery"/
  );
});

test("jeder Bereich wird beim Namen genannt und erklaert", () => {
  for (const locale of ["de", "en"]) {
    const areas = onboardingCopy(locale).areas as Record<string, { name?: string; text?: string }>;
    for (const area of ["align", "find", "connect"]) {
      assert.ok(areas?.[area]?.name, `${locale}: areas.${area}.name fehlt`);
      assert.ok((areas?.[area]?.text ?? "").length > 40, `${locale}: areas.${area}.text erklaert nichts`);
    }
    assert.equal(areas.align.name, "Align");
    assert.equal(areas.find.name, "Find");
    assert.equal(areas.connect.name, "Connect");
  }
});

test("die alten Karten aus der Zeit, als Align das ganze Produkt war, sind weg", () => {
  const form = source(FORM);
  assert.doesNotMatch(form, /nextCards/);
  for (const locale of ["de", "en"]) {
    assert.equal(onboardingCopy(locale).nextCards, undefined, `${locale}: nextCards noch da`);
  }
  // Und die Begruessung nennt nicht mehr einen Bereich als waere er das Produkt.
  assert.doesNotMatch(
    String((onboardingCopy("de").steps as Record<string, { title: string }>).welcome.title),
    /Align/
  );
});

// ---------------------------------------------------------------------------
// Der kurze Weg darf keine Rolle vergeben
// ---------------------------------------------------------------------------
test("wer nur kennenlernen will, wird nicht ungefragt Founderin", () => {
  const action = source(CONNECT_ACTION);

  // profiles.roles traegt `default '{founder}'`. Eine Zeile dort anzulegen,
  // um "keine Rolle" auszudruecken, macht die Person zur Founderin.
  assert.doesNotMatch(
    action.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1"),
    /from\("profiles"\)/,
    "der Connect-Weg fasst profiles an"
  );
  assert.match(action, /rpc\("join_network_as_member"\)/);

  // Und das Formular schickt im kurzen Weg gar keine Rollen mit.
  const form = source(FORM);
  assert.match(form, /isConnectPlan\s*\?\s*completeConnectOnboardingAction/);
  assert.match(form, /\{isConnectPlan \? null : \(/);
});

test("der kurze Weg laesst die Gruendungsfragen und das Bild aus", () => {
  const form = source(FORM);
  assert.match(form, /ONBOARDING_STEPS_CONNECT = \["welcome", "name", "plan", "next"\]/);
  // Index 2 muss in beiden Wegen "plan" sein, sonst springt ein Wechsel der
  // Wahl den Fortschritt zurueck.
  assert.match(form, /ONBOARDING_STEPS_FULL = \["welcome", "name", "plan", "focus"/);
});

test("die Mitgliedschaft kommt vor der Markierung", () => {
  const action = source(CONNECT_ACTION);
  const joinAt = action.indexOf('rpc("join_network_as_member")');
  const markAt = action.indexOf("markOnboardingComplete(client");
  assert.ok(joinAt > 0 && markAt > joinAt, "sonst gilt jemand als eingefuehrt, ohne einen Bereich zu haben");
});

// ---------------------------------------------------------------------------
// Das Versprechen "du kannst jederzeit erweitern"
// ---------------------------------------------------------------------------
test("erweitern funktioniert auch ohne bestehende profiles-Zeile", () => {
  const code = source(ROLE_SAVE);

  // Ein update ohne Treffer wirft nicht - es betrifft null Zeilen. Der Haken
  // bei "Founder" waere fuer Connect-only-Mitglieder folgenlos gewesen, ohne
  // Fehlermeldung. Genau das verspricht der Einstieg aber.
  assert.match(code, /\.from\("profiles"\)\s*\.upsert\(\{ user_id: userId, roles \}, \{ onConflict: "user_id" \}\)/);
  assert.doesNotMatch(code, /from\("profiles"\)\.update\(\{ roles \}\)/);

  for (const locale of ["de", "en"]) {
    assert.ok(onboardingCopy(locale).planChangeable, `${locale}: das Versprechen fehlt im Text`);
  }
});

test("das Versprechen der Umkehrbarkeit deckt sich mit dem, was /profile zulaesst", () => {
  // /profile blendet das Rollenfeld fuer Menschen OHNE Rolle bewusst aus:
  // "Einem Connect-Konto hier 'Founder' anzubieten waere eine
  // Selbstfreischaltung ins Founder-Produkt". Solange das so ist, darf der
  // Einstieg der vorsichtigsten Wahl keinen Haken versprechen, den es fuer
  // sie nicht gibt.
  const profilePage = source("src/app/(product)/profile/page.tsx");
  const gateIsClosed = /\{currentRoles\.length > 0 \? \(\s*<fieldset>/.test(profilePage);

  const form = source(FORM);
  assert.equal(
    /isConnectPlan \? ` \$\{t\("onboarding\.planChangeableConnect"\)\}` : ""/.test(form),
    gateIsClosed,
    gateIsClosed
      ? "das Rollenfeld ist fuer Connect-Konten zu - der Einstieg muss das sagen"
      : "das Rollenfeld ist jetzt offen - der Sonderfall im Einstieg kann weg"
  );

  for (const locale of ["de", "en"]) {
    const copy = onboardingCopy(locale) as Record<string, string>;
    assert.ok(copy.planChangeableConnect, `${locale}: planChangeableConnect fehlt`);
    assert.ok(copy.areasLaterConnect, `${locale}: areasLaterConnect fehlt`);
    // Der allgemeine Satz darf keine Rolle behaupten, die nicht jeder hat.
    assert.doesNotMatch(String(copy.planChangeable), /^Du kannst das jederzeit erweitern/);
  }
});

// ---------------------------------------------------------------------------
// Die Anmeldung
// ---------------------------------------------------------------------------
test("die Anmeldung stellt die Frage nicht mehr", () => {
  const page = source(START);
  assert.doesNotMatch(page, /name="intent"/);
  assert.doesNotMatch(page, /profile_signup_intent/);
  assert.doesNotMatch(page, /issueConnectSignupIntent/);
});

// ---------------------------------------------------------------------------
// Die Zaehlung
// ---------------------------------------------------------------------------
test("die Schrittzahl wird berechnet, nicht in den Text geschrieben", () => {
  const form = source(FORM);
  assert.match(form, /stepsLeft = lastStepIndex - Math\.min\(activeStepIndex, lastStepIndex\)/);

  for (const locale of ["de", "en"]) {
    const copy = onboardingCopy(locale);
    assert.match(String(copy.stepsLeft), /\{count, plural,/, `${locale}: keine Pluralform`);
    // Eine feste Zaehlung im Text waere beim kurzen Weg schlicht falsch.
    const steps = copy.steps as Record<string, Record<string, string>>;
    for (const [id, step] of Object.entries(steps)) {
      assert.equal(step.eyebrow, undefined, `${locale}: ${id} traegt noch eine feste Zaehlung`);
    }
  }
});

// ---------------------------------------------------------------------------
// Die Migration
// ---------------------------------------------------------------------------
test("der Beitritt reaktiviert keine gesperrte Mitgliedschaft", () => {
  const migration = source(MIGRATION);
  assert.match(migration, /on conflict \(user_id\) do nothing/);
  assert.doesNotMatch(
    migration.replace(/--.*$/gm, ""),
    /update public\.network_memberships/,
    "sonst laesst sich eine Sperre selbst aufheben"
  );
  assert.match(migration, /grant execute on function public\.join_network_as_member\(\) to authenticated/);
  assert.match(migration, /revoke all on function public\.join_network_as_member\(\) from public, anon/);
});

test("bestehende Konten werden beim Ausrollen als eingefuehrt markiert", () => {
  const migration = source(MIGRATION);
  // Ohne diesen Backfill wird die laufende Beta beim naechsten Login in den
  // Einstieg gezogen.
  assert.match(migration, /update public\.person_core\s+set onboarding_completed_at = coalesce\(created_at, now\(\)\)/);
});
