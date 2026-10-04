import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  classifyWorkContextPath,
  parseWorkContext,
  resolveActiveView,
  workContextToStore,
} from "@/features/navigation/workContext";

const both = { hasFounder: true, hasAdvisor: true };

test("nur founder und advisor sind gueltige Werte", () => {
  assert.equal(parseWorkContext("founder"), "founder");
  assert.equal(parseWorkContext("advisor"), "advisor");
  for (const value of [undefined, null, "", "Advisor", "admin", "founder;advisor"]) {
    assert.equal(parseWorkContext(value), null, String(value));
  }
});

test("Pfade sind eindeutig Founder, eindeutig Advisor oder gemeinsam", () => {
  for (const path of ["/advisor/dashboard", "/advisor/person/x", "/advisor/review/y", "/advisor/intake/new"]) {
    assert.equal(classifyWorkContextPath(path), "advisor", path);
  }
  for (const path of [
    "/dashboard",
    "/connections",
    "/teams/t1",
    "/teams/t1/setup/equity",
    "/me/profile",
    "/me/profile/workstyle",
    "/discovery",
    "/discovery/suche",
    "/founder-alignment/vorhaben",
    "/founder-library/cliff",
    "/report/abc",
    "/invite/new",
    "/research/workstyle-pretest",
  ]) {
    assert.equal(classifyWorkContextPath(path), "founder", path);
  }
  // Team-Intake ist gemeinsam: Advisor legen an, Founder nehmen teil.
  for (const path of ["/messages", "/messages/c1", "/profile", "/account", "/connect", "/connect/my", "/team-intake", "/team-intake/r1", "/start"]) {
    assert.equal(classifyWorkContextPath(path), "shared", path);
  }
  // Kein Praefix-Zufall.
  assert.equal(classifyWorkContextPath("/advisory"), "shared");
  assert.equal(classifyWorkContextPath("/dashboarding"), "shared");
});

test("/advisor/* gewinnt immer - auch gegen ein Founder-Cookie und einen Override", () => {
  assert.equal(resolveActiveView({ pathname: "/advisor/review/r", ...both, stored: "founder", override: "founder" }), "advisor");
});

test("bei Doppelrolle entscheidet auf gemeinsamen Seiten der zuletzt genutzte Kontext", () => {
  assert.equal(resolveActiveView({ pathname: "/messages", ...both, stored: "advisor" }), "advisor");
  assert.equal(resolveActiveView({ pathname: "/messages", ...both, stored: "founder" }), "founder");
  assert.equal(resolveActiveView({ pathname: "/team-intake", ...both, stored: "advisor" }), "advisor");
  assert.equal(resolveActiveView({ pathname: "/account", ...both, stored: null }), "founder");
});

test("eine Founder-Seite zeigt den Founder-Baum, auch mit Advisor-Cookie", () => {
  assert.equal(resolveActiveView({ pathname: "/teams/t1", ...both, stored: "advisor" }), "founder");
  assert.equal(resolveActiveView({ pathname: "/dashboard", ...both, stored: "advisor" }), "founder");
});

test("bei nur einer Rolle zaehlt das Cookie nicht", () => {
  assert.equal(resolveActiveView({ pathname: "/messages", hasFounder: true, hasAdvisor: false, stored: "advisor" }), "founder");
  assert.equal(resolveActiveView({ pathname: "/messages", hasFounder: false, hasAdvisor: true, stored: "founder" }), "advisor");
  // Reine Advisor sehen auch auf gemeinsamen Seiten ihren Baum.
  assert.equal(resolveActiveView({ pathname: "/profile", hasFounder: false, hasAdvisor: true, stored: null }), "advisor");
  // Connect-only und Menschen ohne Rolle: wie bisher Founder-Ansicht (die
  // Shell blendet fuer Connect-only ohnehin nur Connect ein).
  assert.equal(resolveActiveView({ pathname: "/connect", hasFounder: false, hasAdvisor: false, stored: "advisor" }), "founder");
});

test("geschrieben wird nur bei Doppelrolle und nur auf eindeutigen Seiten", () => {
  assert.equal(workContextToStore({ pathname: "/advisor/group", ...both }), "advisor");
  assert.equal(workContextToStore({ pathname: "/teams/t1", ...both }), "founder");
  assert.equal(workContextToStore({ pathname: "/messages", ...both }), null);
  assert.equal(workContextToStore({ pathname: "/team-intake", ...both }), null);
  assert.equal(workContextToStore({ pathname: "/advisor/group", hasFounder: false, hasAdvisor: true }), null);
  assert.equal(workContextToStore({ pathname: "/dashboard", hasFounder: true, hasAdvisor: false }), null);
});

/**
 * DIE GRENZE: Das Cookie ist Darstellung. Es darf nur dort gelesen werden, wo
 * die Leiste entsteht - nie in einem Datenleser, einer Action oder einer
 * Seite, die ueber Zugang entscheidet.
 */
test("das Cookie taucht nur in Leiste, Layout und Umschalter auf", () => {
  const allowed = new Set([
    join("src", "features", "navigation", "workContext.ts"),
    join("src", "features", "navigation", "ProductShell.tsx"),
    join("src", "features", "dashboard", "DashboardViewSwitch.tsx"),
    join("src", "app", "layout.tsx"),
  ]);
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry === "__tests__") continue;
        walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && !allowed.has(path)) {
        const text = readFileSync(path, "utf8");
        if (/WORK_CONTEXT_COOKIE|ui_work_context|parseWorkContext|resolveActiveView|writeWorkContextCookie/.test(text)) {
          offenders.push(path);
        }
      }
    }
  };
  walk("src");
  assert.deepEqual(offenders, []);
});
