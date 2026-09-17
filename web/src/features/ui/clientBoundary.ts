/**
 * Die Grenze zwischen Server und Browser - und was sie nicht passiert.
 *
 * Am 17.09.2026 warf die Discovery-Profilseite in Produktion: "a server-side
 * exception has occurred". Der Grund war eine Funktion, die als Prop an eine
 * "use client"-Komponente ging. React laesst das nicht zu.
 *
 * Das Unangenehme daran: tsc fand den Typ richtig, next build uebersetzte die
 * Datei, und 1122 Tests liefen gruen - der Fehler entsteht erst beim Rendern.
 * Es war die einzige Fehlerklasse, die bis dahin durchgerutscht ist.
 *
 * WAS HIER GEPRUEFT WIRD:
 *   Ein Prop, dessen Wert SELBST eine Funktion ist. Also `counter={(a) => b}`
 *   oder `copy={{ counter: (a) => b }}`.
 *
 * WAS BEWUSST NICHT AUFFAELLT:
 *   - `options={liste.map((x) => ({ ... }))}` - der Pfeil steht IN einem
 *     Aufruf, uebergeben wird das Ergebnis, ein Array aus Objekten.
 *   - `formAction={meineAktion}` und `action={x.bind(null, y)}` - ein
 *     Bezeichner kann eine Server-Aktion sein, und die darf hinueber.
 *   - Alles zwischen zwei Browser-Komponenten. Dort gibt es keine Grenze.
 *
 * Die Pruefung nimmt also nur, was sicher falsch ist. Ein Fund ist ein Fehler,
 * keine Diskussion.
 */

/** Ob eine Datei im Browser laeuft. */
export function isClientModule(source: string) {
  const head = source.trimStart();
  return head.startsWith('"use client"') || head.startsWith("'use client'");
}

/**
 * Der Bereich zwischen zwei Klammern, Anfuehrungszeichen beachtend.
 *
 * Ohne das Beachten waere ein `{` in einem Text ("z. B. {count}") das Ende
 * eines Props - und die Pruefung liefe auf dem falschen Ausschnitt.
 */
function readBalanced(source: string, start: number, open: string, close: string) {
  let depth = 0;
  let quote: string | null = null;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];

    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return { value: source.slice(start + 1, index), end: index };
    }
  }
  return null;
}

/** Ob dieser Ausdruck selbst eine Funktion ist - nicht: eine enthaelt. */
export function isFunctionExpression(expression: string) {
  const value = expression.trim();
  if (/^(async\s+)?function\b/.test(value)) return true;
  // (a, b) => ...  |  a => ...  |  () => ...
  if (/^(async\s+)?\(([^()]*)\)\s*=>/.test(value)) return true;
  if (/^(async\s+)?[A-Za-z_$][\w$]*\s*=>/.test(value)) return true;
  return false;
}

/** Die Eintraege eines Objektliterals, eine Ebene tief. */
function objectMembers(literal: string) {
  const members: { key: string; value: string }[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  const parts: string[] = [];

  for (let index = 0; index < literal.length; index += 1) {
    const char = literal[index];
    const previous = literal[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if ("{[(".includes(char)) depth += 1;
    else if ("}])".includes(char)) depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(literal.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(literal.slice(start));

  for (const part of parts) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    members.push({ key: part.slice(0, colon).trim(), value: part.slice(colon + 1) });
  }
  return members;
}

export type BoundaryFinding = {
  component: string;
  prop: string;
  detail: string;
};

/**
 * Sucht in einem Server-Modul nach Funktionen, die an die genannten
 * Browser-Komponenten gehen.
 */
export function findFunctionPropsAcrossBoundary(
  source: string,
  clientComponents: Set<string>
): BoundaryFinding[] {
  const findings: BoundaryFinding[] = [];

  for (const component of clientComponents) {
    const pattern = new RegExp(`<${component}(?=[\\s/>])`, "g");
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(source)) !== null) {
      let cursor = match.index + match[0].length;

      // Die Props bis zum Ende des oeffnenden Tags durchgehen.
      while (cursor < source.length) {
        const rest = source.slice(cursor);
        const tagEnd = /^\s*\/?>/.exec(rest);
        if (tagEnd) break;

        const attribute = /^\s*([A-Za-z_$][\w$]*)\s*=\s*\{/.exec(rest);
        if (!attribute) {
          // Etwa `formNoValidate` ohne Wert oder ein Text-Prop in
          // Anfuehrungszeichen - beides kann keine Funktion sein.
          const plain = /^\s*([A-Za-z_$][\w$]*)(\s*=\s*"[^"]*")?/.exec(rest);
          if (!plain || plain[0].trim() === "") break;
          cursor += plain[0].length;
          continue;
        }

        const braceAt = cursor + attribute[0].length - 1;
        const block = readBalanced(source, braceAt, "{", "}");
        if (!block) break;

        const propName = attribute[1];
        const value = block.value.trim();

        if (isFunctionExpression(value)) {
          findings.push({
            component,
            prop: propName,
            detail: value.slice(0, 60),
          });
        } else if (value.startsWith("{") && value.endsWith("}")) {
          // Ein Objektliteral als Prop: Genau so ist der Fehler entstanden -
          // `copy={{ counter: (selected, max) => ... }}`.
          const inner = readBalanced(value, 0, "{", "}");
          if (inner) {
            for (const member of objectMembers(inner.value)) {
              if (isFunctionExpression(member.value)) {
                findings.push({
                  component,
                  prop: `${propName}.${member.key}`,
                  detail: member.value.trim().slice(0, 60),
                });
              }
            }
          }
        }

        cursor = block.end + 1;
      }
    }
  }

  return findings;
}
