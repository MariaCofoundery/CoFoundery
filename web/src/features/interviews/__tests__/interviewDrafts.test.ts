import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clearAllInterviewDrafts,
  clearDraft,
  clearDraftIfSaved,
  draftKey,
  readDraft,
  writeDraft,
} from "@/features/interviews/interviewDrafts";

class MemoryStorage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  key(index: number) { return [...this.items.keys()][index] ?? null; }
  getItem(key: string) { return this.items.has(key) ? this.items.get(key)! : null; }
  setItem(key: string, value: string) { this.items.set(key, String(value)); }
  removeItem(key: string) { this.items.delete(key); }
}

let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  (globalThis as { window?: unknown }).window = { localStorage: store };
});

const KEY = draftKey("session-1", "turn-1");
const source = (path: string) => readFileSync(path, "utf8");

test("the draft stays in the buffer until the server has confirmed it", () => {
  writeDraft(KEY, "Ich habe drei Jahre ein Team geleitet");
  // Autosave not confirmed yet: nothing is cleared.
  assert.equal(readDraft(KEY), "Ich habe drei Jahre ein Team geleitet");
});

test("a confirmed autosave removes the matching draft", () => {
  writeDraft(KEY, "Ich habe drei Jahre ein Team geleitet  ");
  clearDraftIfSaved(KEY, "Ich habe drei Jahre ein Team geleitet");
  assert.equal(readDraft(KEY), null);
});

test("text typed after the save started stays buffered", () => {
  writeDraft(KEY, "Ich habe drei Jahre ein Team geleitet und dann");
  clearDraftIfSaved(KEY, "Ich habe drei Jahre ein Team geleitet");
  assert.equal(readDraft(KEY), "Ich habe drei Jahre ein Team geleitet und dann");
});

test("on load, a leftover equal to the server text is removed and anything else is kept", () => {
  writeDraft(KEY, "gleich");
  clearDraftIfSaved(KEY, "gleich");
  assert.equal(readDraft(KEY), null);
  writeDraft(KEY, "laenger als der Server");
  clearDraftIfSaved(KEY, "kurz");
  assert.equal(readDraft(KEY), "laenger als der Server");
});

test("submit clears the draft of this question", () => {
  writeDraft(KEY, "text");
  clearDraft(KEY);
  assert.equal(readDraft(KEY), null);
});

test("logout clears every interview draft and nothing else", () => {
  writeDraft(draftKey("a", "1"), "one");
  writeDraft(draftKey("b", "2"), "two");
  store.setItem("other.app.key", "keep");
  clearAllInterviewDrafts();
  assert.equal(readDraft(draftKey("a", "1")), null);
  assert.equal(readDraft(draftKey("b", "2")), null);
  assert.equal(store.getItem("other.app.key"), "keep");
});

test("storage failures never throw", () => {
  (globalThis as { window?: unknown }).window = {
    get localStorage(): Storage { throw new Error("blocked"); },
  };
  assert.equal(writeDraft(KEY, "x"), false);
  assert.equal(readDraft(KEY), null);
  assert.doesNotThrow(() => clearAllInterviewDrafts());
  assert.doesNotThrow(() => clearDraftIfSaved(KEY, "x"));
});

test("the answer form wires the buffer to autosave, load and submit", () => {
  const form = source("src/features/interviews/InterviewAnswerForm.tsx");
  // Confirmed autosave clears only what the server now has.
  assert.match(form, /lastSaved\.current = trimmed;[\s\S]{0,200}clearDraftIfSaved\(key, trimmed\);[\s\S]{0,40}setSaveState\("saved"\)/);
  // A failed save keeps the buffer.
  assert.match(form, /if \(!result\.saved\) \{[\s\S]{0,120}setSaveState\("failed"\);\s*return;/);
  // Load: a longer draft is restored; only a synced leftover is removed.
  assert.match(form, /setSaveState\("local"\);\s*return;\s*\}[\s\S]{0,120}clearDraftIfSaved\(key, savedAnswer\);/);
  assert.match(form, /onSubmit=\{\(\) => clearDraft\(key\)\}/);
  // The autosave contract itself is unchanged.
  assert.match(form, /const AUTOSAVE_DELAY_MS = 2_500;/);
  assert.match(form, /actions\.autosave\(\{ turnId, answer: trimmed \}\)/);
});

test("every explicit sign-out clears the drafts first; an expired session does not", () => {
  const shell = source("src/features/navigation/ProductShell.tsx");
  assert.equal(shell.split("<form action={signOutAction} onSubmit={() => clearAllInterviewDrafts()}>").length, 3);
  assert.doesNotMatch(shell, /<form action=\{signOutAction\}>/);
  assert.match(source("src/features/account/AccountAccessSection.tsx"), /<ClearDraftsForm action=\{signOutEverywhereAction\}/);
  assert.match(source("src/features/account/DeleteAccountSection.tsx"), /clearAllInterviewDrafts\(\);\s*startTransition/);
  // No blanket cleanup on the login page: a session that ran out mid-typing keeps its buffer.
  assert.doesNotMatch(source("src/app/(product)/login/page.tsx"), /clearAllInterviewDrafts|ClearDraftsForm/);
});
