import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const code = (path: string) =>
  readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("die Zahl zählt NEUE Vorschläge und liegt in der Markenfarbe, nicht in Rot", () => {
  const shell = code("src/features/navigation/ProductShell.tsx");
  const badge = shell.slice(shell.indexOf("function NewSuggestionsBadge"), shell.indexOf("function normalizeDisplayName"));
  assert.match(badge, /bg-\[#6d49e0\]/);
  assert.doesNotMatch(badge, /bg-red/);
  const data = code("src/features/connect/connectSuggestionData.ts");
  assert.match(data, /countNewConnectSuggestions[\s\S]*?\.is\("seen_at", null\)/);
});

test("sie steht an Connect und an Entdecken", () => {
  const shell = code("src/features/navigation/ProductShell.tsx");
  assert.match(shell, /extraBadge: \{ kind: "suggestions", count: newConnectSuggestionCount \}/);
  assert.match(shell, /newConnectSuggestionCount > 0 \? \{ count:/);
  assert.match(shell, /areaBadge\(item\.badge, item\.extraBadge\)/);
});

test("gesehen heißt: die Liste wurde geöffnet, nicht der Streifen", () => {
  assert.match(code("src/app/(product)/connect/suggestions/page.tsx"), /ConnectMarkSuggestionsSeen/);
  assert.doesNotMatch(code("src/app/(product)/connect/page.tsx"), /MarkSuggestionsSeen|markConnectSuggestionsSeen/);
  const action = code("src/features/connect/connectSuggestionActions.ts");
  const mark = action.slice(action.indexOf("markConnectSuggestionsSeenAction"));
  // Die Tabelle erlaubt Angemeldeten kein UPDATE: Es läuft über eine Funktion.
  assert.match(mark, /supabase\.rpc\("mark_connect_suggestions_seen"\)/);
  assert.doesNotMatch(mark, /\.update\(/);
  const sql = readFileSync("../supabase/migrations/20270113130000_mark_connect_suggestions_seen.sql", "utf8");
  assert.match(sql, /where recipient_user_id = auth\.uid\(\)\s+and dismissed_at is null\s+and seen_at is null/);
  assert.match(sql, /revoke all on function public\.mark_connect_suggestions_seen\(\) from public, anon/);
});
