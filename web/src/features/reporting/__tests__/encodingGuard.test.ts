import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildChallengeExamples } from "@/features/reporting/challengeTextBuilder";
import { buildComplementExamples } from "@/features/reporting/complementTextBuilder";
import { buildFounderMatchingTextExamples } from "@/features/reporting/founderMatchingTextBuilder";
import { buildHeroTextExamples } from "@/features/reporting/heroTextBuilder";
import { buildPatternExamples } from "@/features/reporting/patternTextBuilder";
import { normalizeGermanText } from "@/lib/normalizeGermanText";

const SUSPICIOUS_ENCODING_PATTERNS = [/Ã./u, /Â./u, /â€./u, /�/u, /\uFFFD/u];
const KNOWN_BAD_MUTATIONS = ["zürst", "Daür", "aufbaünd"];

test("normalizeGermanText repairs mojibake and does not corrupt valid German words", () => {
  assert.equal(normalizeGermanText("zuerst Dauer aufbauend"), "zuerst Dauer aufbauend");
  assert.equal(normalizeGermanText("staerker abgestimmt"), "stärker abgestimmt");
  assert.equal(
    normalizeGermanText("darueber Rueckkopplung und Verfuegbarkeit klaert ihr frueh."),
    "darüber Rückkopplung und Verfügbarkeit klärt ihr früh."
  );
  assert.equal(normalizeGermanText("MaÃŸ und Ã¼ber â€“ frueh"), "Maß und über – früh");
});

test("generated reporting texts stay free of mojibake and known false umlauts", () => {
  const generatedTexts = [
    ...buildHeroTextExamples().map((entry) => entry.heroText),
    ...buildPatternExamples().flatMap((entry) => entry.patterns.flatMap((pattern) => [pattern.title, pattern.description])),
    ...buildChallengeExamples().flatMap((entry) =>
      entry.challenges.flatMap((challenge) => [challenge.title, challenge.description])
    ),
    ...buildComplementExamples().flatMap((entry) =>
      entry.complements.flatMap((complement) => [complement.title, complement.description])
    ),
    ...Object.values(buildFounderMatchingTextExamples()).flatMap((entry) => [
      entry.hero,
      entry.stableBase.title,
      entry.stableBase.body,
      entry.strongestComplement.title,
      entry.strongestComplement.body,
      entry.biggestTension.title,
      entry.biggestTension.body,
      entry.dailyDynamics,
      ...entry.agreements,
    ]),
  ];

  for (const text of generatedTexts) {
    const normalized = normalizeGermanText(text);

    for (const pattern of SUSPICIOUS_ENCODING_PATTERNS) {
      assert.equal(pattern.test(normalized), false, `Unexpected encoding pattern ${pattern} in: ${normalized}`);
    }

    for (const brokenWord of KNOWN_BAD_MUTATIONS) {
      assert.equal(normalized.includes(brokenWord), false, `Unexpected broken word "${brokenWord}" in: ${normalized}`);
    }
  }
});

test("source files contain no mojibake outside the normalization repair table", () => {
  const projectRoot = path.resolve(process.cwd(), "src");
  const docsRoot = path.resolve(process.cwd(), "docs");
  const files = [...collectTextFiles(projectRoot), ...collectTextFiles(docsRoot)];

  for (const filePath of files) {
    if (filePath.endsWith(path.join("src", "lib", "normalizeGermanText.ts"))) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    for (const pattern of SUSPICIOUS_ENCODING_PATTERNS) {
      assert.equal(pattern.test(content), false, `Unexpected encoding pattern ${pattern} in ${filePath}`);
    }
  }
});

function collectTextFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTextFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|json|md)$/u.test(entry.name)) continue;

    files.push(fullPath);
  }

  return files;
}
