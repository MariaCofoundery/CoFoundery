import type { PublicSourceProblem } from "@/features/connect/publicSourceProblems";

const text = (value: string) => `'${value.replace(/'/g, "''")}'`;
const list = (values: readonly string[]) =>
  values.length ? `array[${values.map(text).join(", ")}]::text[]` : "array[]::text[]";

/**
 * Das SQL, mit dem die Eintraege aus oeffentlichen Quellen eingespielt werden.
 *
 * Wiederholbar: Der Schluessel (`seed_key`) macht aus einem zweiten Lauf eine
 * Aktualisierung. Der Zeitpunkt der Veroeffentlichung bleibt dabei stehen, sonst
 * wuerden die Eintraege bei jedem Lauf wieder ganz nach oben springen.
 *
 * Die Eintraege bekommen bewusst einen Zeitpunkt vor 30 Tagen: Das Brett ist
 * nach Aktualitaet geordnet, und was Mitglieder schreiben, soll darueber
 * stehen und nicht unter 21 Startinhalten verschwinden. Innerhalb der Gruppe
 * gilt die Reihenfolge der Liste (der erste Eintrag ist der neueste).
 *
 * Der Dienst (service_role oder die Datenbankrolle im SQL-Editor) darf das;
 * Mitglieder koennen solche Eintraege nicht anlegen, aendern oder loeschen.
 */
export function buildPublicSourceProblemsSql(problems: readonly PublicSourceProblem[]): string {
  const rows = problems.map(
    (problem, index) =>
      `  (null, ${text(problem.title)}, ${text(problem.description)}, 'observation', ` +
      `${list(problem.locations)}, ${text(problem.scope)}, ${list(problem.topics)}, ${list(problem.industries)}, ` +
      `'active', now() - interval '30 days' - interval '${index} minutes', 'public_source', ${text(problem.key)}, ` +
      `${text(problem.sourceName)}, ${text(problem.sourceUrl)}, ${text(problem.sourceYear)}, ${text(problem.sourceNote)})`
  );

  return `-- Eintraege aus oeffentlichen Quellen fuers Problembrett.
-- ERZEUGT aus web/src/features/connect/publicSourceProblems.ts mit
-- \`npm run public-problems:sql\`. Nicht von Hand aendern, sondern die Liste.
-- Setzt Migration 20270111120000_problem_public_source.sql voraus.
-- Wiederholbar: ein zweiter Lauf aktualisiert die Eintraege.
begin;

insert into public.network_problems (
  author_user_id, title, description, author_intent, locations, geographic_scope, topics, industries,
  status, published_at, origin, seed_key, source_name, source_url, source_year, source_note
) values
${rows.join(",\n")}
on conflict (seed_key) where seed_key is not null do update set
  title = excluded.title,
  description = excluded.description,
  locations = excluded.locations,
  geographic_scope = excluded.geographic_scope,
  topics = excluded.topics,
  industries = excluded.industries,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  source_year = excluded.source_year,
  source_note = excluded.source_note;

commit;
`;
}
