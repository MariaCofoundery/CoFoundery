import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const code = (path: string) => readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

test("die Frage nach der Forschung kommt höchstens einmal je Konto", () => {
  const layout = code("src/app/layout.tsx");
  // Gelesen wird nur, wenn es noch keine Entscheidung gibt; ein Lesefehler heißt "schon gefragt".
  assert.match(layout, /research_consent_prompt_seen/);
  assert.match(layout, /error \? true : Boolean\(data\)/);
  assert.match(layout, /researchPromptSeen=\{researchPromptSeen\}/);

  const shell = code("src/features/navigation/ProductShell.tsx");
  assert.match(shell, /const showResearchNotice = hasFounder && researchConsentState === "undecided" && !researchPromptSeen && !researchPromptClosed/);
  // Standard ohne Angabe: nicht fragen.
  assert.match(shell, /researchPromptSeen = true/);
  // Alle drei Stellen, an denen die Shell das Fenster zeigt, nutzen dieselbe Bedingung.
  assert.equal((shell.match(/<ResearchConsentNotice/g) ?? []).length, 3);
  assert.equal((shell.match(/showResearchNotice \?/g) ?? []).length, 3);
  assert.doesNotMatch(shell, /hasFounder && researchConsentState === "undecided" \?/);
});

test("gezeigt heißt gefragt - noch bevor jemand antwortet; ohne Antwort bleibt es bei keiner Einwilligung", () => {
  const notice = code("src/features/research/ResearchConsentNotice.tsx");
  assert.match(notice, /useEffect\(\(\) => \{\s*void markResearchPromptSeenAction\(\)/);
  assert.match(notice, /onClick=\{onLater\}/);
  // "Später" speichert KEINE Entscheidung.
  const later = notice.slice(notice.indexOf("onClick={onLater}") - 200, notice.indexOf("onClick={onLater}") + 50);
  assert.doesNotMatch(later, /setResearchConsentAction/);
  // Der Wortlaut der Einwilligung (und damit sein Nachweis-Hash) bleibt unberührt: "later" gehört nicht zu den gehashten Schlüsseln.
  assert.doesNotMatch(code("src/features/research/consentVersion.ts"), /notice\.later/);
});

test("die Datenbank: nur eigener Vermerk, keine Einwilligung, mit dem Konto gelöscht", () => {
  const sql = readFileSync("../supabase/migrations/20270403120000_research_consent_prompt_seen.sql", "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /using \(user_id = auth\.uid\(\)\)/);
  assert.match(sql, /on delete cascade/);
  assert.doesNotMatch(sql, /insert into public\.research_consent_preferences/);
  assert.match(code("src/features/account/accountExport.ts"), /table: "research_consent_prompt_seen"/);
});
