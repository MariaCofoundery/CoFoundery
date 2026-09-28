import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { REWORDINGS_V2, isReworded, reword } from "@/features/instruments/v2/rewordingsV2";
import { getAlignmentItems, getAlignmentPreferences } from "@/features/instruments/v2/alignmentRegistryV2";
import { getContextBlocks, getValueCases } from "@/features/instruments/v2/contextRegistryV2";

const PAPER = "../docs/CoFoundery_Wissenschaftliche_Neukonzeption.md";

test("jede Umformulierung nennt ein Original, das es wirklich gibt", () => {
  // OHNE DAS WÄRE ES KEINE ÜBERARBEITUNG, SONDERN EIN ERSATZ. Eine
  // Umformulierung, deren Original nirgends mehr steht, kann niemand mehr
  // gegen das Gutachten halten.
  const paper = readFileSync(PAPER, "utf8");
  const orphans = REWORDINGS_V2.rewordings
    .filter((entry) => !paper.includes(entry.source))
    .map((entry) => `${entry.target}.${entry.field}`);
  assert.deepEqual(orphans, [], "Kein Original im Gutachten:\n" + orphans.join("\n"));
});

test("jede Umformulierung trifft den Text, der heute in der Registratur steht", () => {
  // Der gefährliche Fall: Die Registratur wird korrigiert, die Umformulierung
  // bleibt stehen und zeigt weiter auf den alten Wortlaut. Dann liefe still
  // eine veraltete Fassung aus.
  const sources = new Map<string, string>();
  for (const item of getAlignmentItems()) sources.set(`${item.itemId}|prompt`, item.sourcePrompt);
  for (const block of getContextBlocks()) sources.set(`${block.blockId}|prompt`, block.sourcePrompt);
  for (const value of getValueCases()) sources.set(`${value.caseId}|situation`, value.sourceSituation);
  for (const preference of getAlignmentPreferences()) {
    if (preference.sourceCondition) sources.set(`${preference.id}|condition`, preference.sourceCondition);
  }

  const stale: string[] = [];
  for (const entry of REWORDINGS_V2.rewordings) {
    const known = sources.get(`${entry.target}|${entry.field}`);
    if (known === undefined) stale.push(`${entry.target}.${entry.field}: Ziel gibt es nicht`);
    else if (known !== entry.source) stale.push(`${entry.target}.${entry.field}: Original abweichend`);
  }
  assert.deepEqual(stale, [], stale.join("\n"));

  // Und die Prüfung schlägt wirklich an, nicht nur theoretisch.
  assert.throws(() => reword("A02", "prompt", "irgendein anderer Text"), /rewording_stale/);
});

test("keine Umformulierung ist wirkungslos oder unbegründet", () => {
  for (const entry of REWORDINGS_V2.rewordings) {
    const where = `${entry.target}.${entry.field}`;
    assert.notEqual(entry.text, entry.source, `${where}: ändert nichts`);
    // Eine Begründung, die nur „klarer" sagt, ist in einem Jahr wertlos.
    assert.ok(entry.reason.length > 40, `${where}: zu dünne Begründung`);
    assert.ok(entry.text.trim().length > 0, where);
  }
  assert.ok(REWORDINGS_V2.decidedBy.trim());
  assert.match(REWORDINGS_V2.createdAt, /^\d{4}-\d{2}-\d{2}$/);
});

test("die Leser liefern die überarbeitete Fassung und behalten das Original", () => {
  // DAS IST DER EIGENTLICHE ZWECK. Wer eine Ansicht baut, bekommt automatisch
  // den lesbaren Text - und kann den Originalwortlaut trotzdem nachschlagen.
  const a02 = getAlignmentItems().find((item) => item.itemId === "A02")!;
  assert.ok(isReworded("A02", "prompt"));
  assert.notEqual(a02.prompt, a02.sourcePrompt);
  assert.match(a02.prompt, /die wichtigste Annahme dahinter stimmt/);
  assert.match(a02.sourcePrompt, /eine zentrale Annahme anhand verfügbarer Daten/);

  // Und wo nichts überarbeitet wurde, sind beide gleich. Seit dem 28.09.2026
  // ist jede Frage der Gesprächsfassung überarbeitet, deshalb steht hier eine
  // aus dem Forschungspool.
  const a03 = getAlignmentItems().find((item) => item.itemId === "A03")!;
  assert.equal(a03.inMvp, false);
  assert.equal(a03.prompt, a03.sourcePrompt);

  // Jeder Leser füllt das Quellfeld - sonst stünde irgendwo `undefined`.
  for (const item of getAlignmentItems()) assert.ok(item.sourcePrompt, item.itemId);
  for (const block of getContextBlocks()) assert.ok(block.sourcePrompt, block.blockId);
  for (const value of getValueCases()) assert.ok(value.sourceSituation, value.caseId);
});

test("T03 und T06 sind jetzt auseinanderzuhalten", () => {
  // Der Grund für diese beiden Umformulierungen: Sie lasen sich fast gleich.
  // Wer beide hintereinander bekommt, sucht den Unterschied statt zu antworten.
  const byId = new Map(getAlignmentItems().map((item) => [item.itemId, item]));
  const t03 = byId.get("T03")!.prompt;
  const t06 = byId.get("T06")!.prompt;

  assert.match(t03, /am selben Arbeitstag/);
  assert.match(t06, /sofort/);
  // Kein gemeinsamer langer Wortlaut mehr, an dem beide gleich aussehen.
  assert.ok(!t03.includes("zur Sprache bringen"));
  assert.ok(!t06.includes("die Klärung erst später"));
});
