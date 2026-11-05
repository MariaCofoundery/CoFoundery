/**
 * Teamraum-Seiten (seit 05.11.2026): der Text einer Seite in Bloecke zerlegt, und der Seitenbaum.
 *
 * Geschrieben wird schlicht, wie in einer Nachricht:
 *   "# " / "## " / "### "  Ueberschrift
 *   "- "                    Liste
 *   "[ ] " / "[x] "         Haekchen-Zeile (auch "- [ ] ") - kann eine Aufgabe werden
 *   **fett**, *kursiv*      wie ueberall (UserText)
 * Leere Zeilen trennen Absaetze. Kein HTML, keine Links - der Text wird nie als Markup ausgegeben.
 *
 * WICHTIG: Welche Zeile eine Haekchen-Zeile ist, entscheidet auch die Datenbank
 * (org_page_item_text, 20270313120000). Die Regel hier muss dieselbe sein, sonst zeigt die Seite
 * Zeile 3 an und die Datenbank hakt Zeile 4 ab. Der Test vergleicht beide Muster.
 */

export const ITEM_PATTERN = /^\s*(-\s*)?\[( |x|X)\]/;
const ITEM_PREFIX = /^\s*(-\s*)?\[( |x|X)\]\s*/;

export type PageBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "item"; index: number; text: string; done: boolean }
  | { kind: "bullets"; items: string[] }
  | { kind: "paragraph"; text: string };

export function parsePageBlocks(body: string): PageBlock[] {
  const blocks: PageBlock[] = [];
  let itemIndex = 0;
  let paragraph: string[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
    if (bullets.length > 0) blocks.push({ kind: "bullets", items: bullets });
    paragraph = [];
    bullets = [];
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (ITEM_PATTERN.test(line)) {
      flush();
      // Leere Haekchen-Zeilen zaehlen auch in der Datenbank mit - der Index muss passen.
      blocks.push({ kind: "item", index: itemIndex, text: line.replace(ITEM_PREFIX, "").trim(), done: /\[(x|X)\]/.test(line) });
      itemIndex += 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line.trim());
    if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      continue;
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (paragraph.length > 0) {
        blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
        paragraph = [];
      }
      bullets.push(bullet[1].trim());
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (bullets.length > 0) {
      blocks.push({ kind: "bullets", items: bullets });
      bullets = [];
    }
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

export type OrgPageSummary = {
  id: string;
  parentId: string | null;
  title: string;
  isTemplate: boolean;
  eventId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  updatedAt: string;
};
export type OrgPage = OrgPageSummary & { body: string };
export type PageTreeEntry = OrgPageSummary & { depth: number; childCount: number };

/** Der Baum in Lesereihenfolge: jede Seite, darunter ihre Unterseiten, je Ebene nach Titel. Vorlagen stehen gesondert. */
export function buildPageTree(pages: OrgPageSummary[]): PageTreeEntry[] {
  const regular = pages.filter((page) => !page.isTemplate);
  const known = new Set(regular.map((page) => page.id));
  const childrenOf = new Map<string | null, OrgPageSummary[]>();
  for (const page of regular) {
    // Haengt eine Seite an einer Vorlage oder einer unbekannten Seite, steht sie oben.
    const parent = page.parentId && known.has(page.parentId) ? page.parentId : null;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), page]);
  }
  const out: PageTreeEntry[] = [];
  const walk = (parent: string | null, depth: number) => {
    const children = (childrenOf.get(parent) ?? []).sort((a, b) => a.title.localeCompare(b.title, "de"));
    for (const child of children) {
      out.push({ ...child, depth, childCount: (childrenOf.get(child.id) ?? []).length });
      if (depth < 3) walk(child.id, depth + 1);
    }
  };
  walk(null, 1);
  return out;
}

/** Wohin eine Seite gehaengt werden darf: nicht unter sich selbst oder ihre Unterseiten, hoechstens drei Ebenen. */
export function parentOptions(tree: PageTreeEntry[], pageId: string | null, subtreeHeight = 1): PageTreeEntry[] {
  const excluded = new Set<string>();
  if (pageId) {
    excluded.add(pageId);
    let grew = true;
    while (grew) {
      grew = false;
      for (const entry of tree) {
        if (entry.parentId && excluded.has(entry.parentId) && !excluded.has(entry.id)) {
          excluded.add(entry.id);
          grew = true;
        }
      }
    }
  }
  return tree.filter((entry) => !excluded.has(entry.id) && entry.depth + subtreeHeight <= 3);
}

/** Wie tief reicht der Teilbaum unter einer Seite (nur die Seite = 1)? */
export function subtreeHeight(tree: PageTreeEntry[], pageId: string): number {
  const below = tree.filter((entry) => entry.parentId === pageId);
  return 1 + (below.length === 0 ? 0 : Math.max(...below.map((entry) => subtreeHeight(tree, entry.id))));
}

export const BUILT_IN_TEMPLATES = ["event", "meeting", "onboarding"] as const;
export type BuiltInTemplate = (typeof BUILT_IN_TEMPLATES)[number];
export const isBuiltInTemplate = (value: unknown): value is BuiltInTemplate => (BUILT_IN_TEMPLATES as readonly unknown[]).includes(value);

export function pageOf(row: Record<string, unknown>): OrgPage {
  return {
    id: row.id as string,
    parentId: (row.parent_id as string | null) ?? null,
    title: row.title as string,
    isTemplate: row.is_template === true,
    eventId: (row.event_id as string | null) ?? null,
    createdByUserId: (row.created_by_user_id as string | null) ?? null,
    updatedByUserId: (row.updated_by_user_id as string | null) ?? null,
    updatedAt: row.updated_at as string,
    body: typeof row.body === "string" ? row.body : "",
  };
}
