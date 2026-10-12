import { readFileSync } from "node:fs";

/** Existing structural/privacy guards inspect source. Resolve moved DE copy so
 * those guards keep checking the same UI contract after extraction to messages.
 * Runtime EN output is covered separately by localizationBetaBlockers.test.ts. */
export function withWorkstyleCopy(source: string): string {
  const messages = JSON.parse(readFileSync("messages/de/workstyleFlow.json", "utf8")) as Record<string, string>;
  const resolved = source.replace(/t\("([^"]+)"(?:, \{([^}]+)\})?\)/g, (original, key: string, args: string | undefined) => {
    let text = messages[key];
    if (!text) return original;
    if (args) {
      const values = Object.fromEntries(args.split(/,\s*(?=p\d+:)/).map(entry => {
        const colon = entry.indexOf(":");
        return [entry.slice(0, colon).trim(), entry.slice(colon + 1).trim()];
      }));
      text = text.replace(/\{(p\d+)\}/g, (_, p: string) => "${" + values[p] + "}");
      return "`" + text + "`";
    }
    return JSON.stringify(text);
  });
  return resolved.replace(/\{("(?:[^"\\]|\\.)*")\}/g, (_, literal: string) => JSON.parse(literal));
}
