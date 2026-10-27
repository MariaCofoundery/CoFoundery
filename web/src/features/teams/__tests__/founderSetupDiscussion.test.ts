import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import de from "../../../../messages/de/teams.json" with { type: "json" };
import en from "../../../../messages/en/teams.json" with { type: "json" };
import { groupFounderSetupDiscussionEntries } from "@/features/teams/founderSetupDiscussion";

test("setup discussion groups one reply level without changing working or confirmed state", () => {
  const threads = groupFounderSetupDiscussionEntries([
    { id: "root", teamId: "team", itemKey: "decision_rights", authorUserId: "a", parentEntryId: null, body: "Thought", createdAt: "2026-01-01" },
    { id: "reply", teamId: "team", itemKey: "decision_rights", authorUserId: "b", parentEntryId: "root", body: "Reply", createdAt: "2026-01-02" },
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].root.body, "Thought");
  assert.equal(threads[0].replies[0].body, "Reply");
  assert.equal("workingNote" in threads[0], false);
  assert.equal("revision" in threads[0], false);
});

test("discussion copy is structurally parallel in DE and EN", () => {
  assert.deepEqual(Object.keys(de.setup.discussion), Object.keys(en.setup.discussion));
  assert.equal(de.setup.discussion.title, "Gespräch & Notizen");
  assert.equal(en.setup.discussion.title, "Discussion & notes");
  assert.match(de.setup.discussion.visibility, /alle aktuellen Founder/u);
  assert.match(en.setup.discussion.visibility, /all current founders/u);
});

test("the item page puts the one open action first, then the conversation, then the shared result", () => {
  // GEAENDERT am 27.10.2026 (Umbau der Themenseite): Die offene Handlung steht jetzt
  // OBEN ("Jetzt dran"), nicht mitten auf der Seite. Danach das Gespraech, dann
  // "Euer Stand" mit Vorschlag und Formular. Auf breiten Fenstern steht der Stand
  // daneben, auf schmalen ueber dem Gespraech (nur die Anzeige, nicht die DOM-Folge).
  const page = readFileSync("src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx", "utf8");
  const now = page.indexOf('aria-labelledby="now-title"');
  const discussion = page.indexOf('aria-labelledby="discussion-title"');
  const stand = page.indexOf('aria-labelledby="stand-title"');
  assert.ok(now >= 0 && discussion > now, "die offene Handlung steht nicht vor dem Gespraech");
  assert.ok(stand > discussion, "der Stand steht nicht nach dem Gespraech");
  // Der offene Vorschlag steht vor der Stelle, an der man ihn ersetzt.
  assert.ok(page.indexOf('revisionBlock(item.pendingRevision, "pending")') < page.indexOf("{editor}"), "man ersetzt einen Vorschlag, den man nicht gesehen hat");
  assert.match(page, /FounderSetupDiscussionComposer/u);
  assert.doesNotMatch(page, /advisor/i);
});

test("es gibt genau EIN Textfeld für den gemeinsamen Text", () => {
  // Das war Marias Beschwerde am 19.09.2026: "viel zu viel". Auf der Seite
  // standen zwei Textfelder mit demselben Inhalt - die Arbeitsnotiz und der
  // Vorschlagstext, letzterer mit der Notiz vorbelegt. Denselben Text zweimal
  // zu tippen oder zweimal zu speichern war der eigentliche Fehler.
  const page = readFileSync("src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx", "utf8");
  const textareas = page.match(/<textarea/gu) ?? [];
  assert.equal(textareas.length, 1, "wieder mehr als ein Textfeld auf der Seite");
  assert.match(page, /name="note"/u);
  assert.doesNotMatch(page, /name="workingNote"|name="proposalNote"/u);

  // Zwei Handlungen auf demselben Formular - nicht zwei Formulare.
  assert.match(page, /formAction=\{proposeAction\}/u);
  const action = readFileSync("src/features/teams/founderSetupActions.ts", "utf8");
  assert.equal((action.match(/formString\(formData, "note"\)/gu) ?? []).length, 2);

  // Getrennt bleiben muss, was getrennt IST: Eine Notiz ist kein gemeinsamer
  // Stand, und das sind weiterhin zwei verschiedene Aktionen und zwei
  // verschiedene Zustaende in der Datenbank.
  assert.match(action, /save_founder_team_setup_working_state|update/u);
  assert.match(action, /propose_founder_team_setup_revision/u);
});

test("the discussion data path is narrow and does not expose email or advisor access", () => {
  const data = readFileSync("src/features/teams/founderSetupData.ts", "utf8");
  const action = readFileSync("src/features/teams/founderSetupActions.ts", "utf8");
  const advisorRead = readFileSync("src/features/teams/founderSetupAdvisorAccessData.ts", "utf8");
  assert.match(data, /founder_team_setup_discussion_entries/u);
  assert.match(data, /author_user_id/u);
  assert.doesNotMatch(data.slice(data.indexOf("getFounderSetupDiscussion")), /email/u);
  assert.match(action, /create_founder_team_setup_discussion_entry/u);
  assert.doesNotMatch(advisorRead, /founder_team_setup_discussion_entries/u);
});
