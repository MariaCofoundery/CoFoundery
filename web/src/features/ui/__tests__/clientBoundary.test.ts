import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  findFunctionPropsAcrossBoundary,
  findTranslatorNames,
  isClientModule,
  isFunctionExpression,
} from "@/features/ui/clientBoundary";

/**
 * Das Netz gegen die eine Fehlerklasse, die bisher durchgerutscht ist.
 *
 * Am 17.09.2026 warf die Discovery-Profilseite in Produktion, weil eine
 * Funktion an eine Browser-Komponente ging. tsc, next build und 1122 Tests
 * waren gruen - der Fehler entsteht erst beim Rendern.
 *
 * Der Pruefer wird hier ZUERST selbst geprueft: an dem Ausschnitt, der den
 * Absturz verursacht hat, und an den Faellen, die er NICHT melden darf. Ohne
 * das koennte er stumm nichts finden und trotzdem gruen sein.
 */

// ---------------------------------------------------------------------------
// 1. Der Pruefer, geprueft
// ---------------------------------------------------------------------------
test("it recognises the expression that caused the crash", () => {
  const crashed = `
    <DiscoveryRoleField
      name="ownRoles"
      copy={{
        limitReached: t("profile.publicProfile.roleLimitReached"),
        counter: (selected, max) =>
          t("profile.publicProfile.roleCounter", { selected, max }),
      }}
    />`;
  const findings = findFunctionPropsAcrossBoundary(crashed, new Set(["DiscoveryRoleField"]));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].prop, "copy.counter");
});

test("it recognises a function passed directly", () => {
  const source = `<Widget onPick={(value) => doSomething(value)} />`;
  const findings = findFunctionPropsAcrossBoundary(source, new Set(["Widget"]));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].prop, "onPick");
});

test("it stays quiet where an arrow only builds a value", () => {
  // Der Pfeil steht IN einem Aufruf - uebergeben wird das Ergebnis.
  const source = `
    <Widget
      options={LIST.map((option) => ({ value: option, label: t(option) }))}
      counterByCount={Array.from({ length: max + 1 }, (_, n) => t("k", { n }))}
    />`;
  assert.deepEqual(findFunctionPropsAcrossBoundary(source, new Set(["Widget"])), []);
});

test("it stays quiet for server actions", () => {
  // Ein Bezeichner kann eine Server-Aktion sein, und die darf hinueber.
  const source = `
    <SubmitButton
      formAction={saveDraftAndLeave.bind(null, "/profile")}
      formNoValidate
      label={t("a")}
      className="x"
    />`;
  assert.deepEqual(findFunctionPropsAcrossBoundary(source, new Set(["SubmitButton"])), []);
});

test("a brace inside a text does not end a prop", () => {
  // Ohne Beachtung der Anfuehrungszeichen liefe die Pruefung auf dem falschen
  // Ausschnitt und faende danach gar nichts mehr.
  const source = `
    <Widget
      hint={"nimm bis zu {count} Rollen"}
      onPick={(value) => use(value)}
    />`;
  const findings = findFunctionPropsAcrossBoundary(source, new Set(["Widget"]));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].prop, "onPick");
});

test("it tells a function expression from a value", () => {
  for (const yes of ["(a) => a", "a => a", "() => 1", "async (a) => a", "function (a) {}"]) {
    assert.ok(isFunctionExpression(yes), yes);
  }
  for (const no of ['t("k")', "list.map((x) => x)", "someAction.bind(null, 1)", "{ a: 1 }", "[1, 2]"]) {
    assert.ok(!isFunctionExpression(no), no);
  }
});

test("it knows which modules run in the browser", () => {
  assert.ok(isClientModule('"use client";\n\nexport function X() {}'));
  assert.ok(isClientModule("'use client'\nexport function X() {}"));
  assert.ok(!isClientModule('import "server-only";\nexport function X() {}'));
});

// ---------------------------------------------------------------------------
// 2. Das ganze Verzeichnis
// ---------------------------------------------------------------------------
function walk(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      walk(full, files);
    } else if (full.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

/** Die Namen, die eine Datei nach aussen gibt. */
function exportedComponents(source: string) {
  const names = new Set<string>();
  for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+([A-Z][\w$]*)/g)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/export\s+const\s+([A-Z][\w$]*)\s*[=:]/g)) {
    names.add(match[1]);
  }
  return names;
}

test("a translator identifier is caught, not just a function literal", () => {
  // Der zweite Absturz dieser Art, am 18.09.2026: `t={t}` auf
  // /connect/listings/new (Digest 876835063). Ein blosser Bezeichner - kein
  // Funktionsliteral -, deshalb lief er durch die alte Pruefung.
  const source = `
    import { getTranslations } from "next-intl/server";
    export default async function Page() {
      const t = await getTranslations("connect");
      return <ConnectListingForm category="expertise" t={t} />;
    }
  `;
  const findings = findFunctionPropsAcrossBoundary(source, new Set(["ConnectListingForm"]));
  assert.equal(findings.length, 1, "der Uebersetzer geht ungesehen ueber die Grenze");
  assert.equal(findings[0]?.prop, "t");
});

test("the translator is also recognised inside a Promise.all", () => {
  // Die zweite Schreibweise im Bestand - ohne sie waere die halbe Codebasis
  // ungeprueft geblieben.
  const source = `
    const [t, locale, filters] = await Promise.all([
      getTranslations("connect"),
      getLocale(),
      searchParams,
    ]);
    return <Widget label={locale} t={t} />;
  `;
  const names = findTranslatorNames(source);
  assert.ok(names.has("t"), "t wurde nicht als Uebersetzer erkannt");
  assert.ok(!names.has("locale"), "locale ist keine Funktion");
  assert.ok(!names.has("filters"));
});

test("an unknown identifier stays allowed", () => {
  // Ein Bezeichner, von dem die Datei nichts weiss, koennte eine
  // Server-Aktion sein - und die darf hinueber.
  const source = `
    export default function Page() {
      return <Form action={saveThing} onDone={handler} />;
    }
  `;
  assert.deepEqual(findFunctionPropsAcrossBoundary(source, new Set(["Form"])), []);
});

test("no server module hands a function to a component that runs in the browser", () => {
  const files = walk("src");
  const sources = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));

  const clientComponents = new Set<string>();
  for (const [, source] of sources) {
    if (!isClientModule(source)) continue;
    for (const name of exportedComponents(source)) clientComponents.add(name);
  }
  // Ohne bekannte Browser-Komponenten prueft der Sweep nichts und waere
  // stumm gruen - das waere die schlechteste aller Meldungen.
  assert.ok(clientComponents.size > 10, `zu wenige gefunden: ${clientComponents.size}`);
  assert.ok(clientComponents.has("SubmitButton"));
  assert.ok(clientComponents.has("DiscoveryRoleField"));

  const problems: string[] = [];
  for (const [file, source] of sources) {
    // Zwischen zwei Browser-Komponenten gibt es keine Grenze.
    if (isClientModule(source)) continue;
    for (const finding of findFunctionPropsAcrossBoundary(source, clientComponents)) {
      problems.push(`${file}: <${finding.component} ${finding.prop}={${finding.detail}}>`);
    }
  }

  assert.deepEqual(
    problems,
    [],
    `Funktionen ueber die Server-Browser-Grenze:\n  ${problems.join("\n  ")}`
  );
});
