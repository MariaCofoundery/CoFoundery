/**
 * Die Datenbankprüfungen ans Tor hängen - ohne das Tor zu verstopfen.
 *
 * DAS PROBLEM, DAS DAS LÖST: Drei pgTAP-Suiten waren tagelang rot, ohne dass
 * es jemand gemerkt hat - eine davon seit ihrer Entstehung. `ci:check` führt
 * sie nicht aus, also fiel nichts auf. Rote Tests, die niemand sieht, höhlen
 * die Zusagen aus, die sie halten sollen.
 *
 * WARUM SIE NICHT EINFACH FEST DAZUGEHÖREN: Sie brauchen Docker und den
 * lokalen Supabase-Stapel. Ein Tor, das ohne laufendes Docker scheitert, wird
 * umgangen - und ein umgangenes Tor ist schlechter als keins.
 *
 * DER MITTELWEG: Läuft die Datenbank, laufen die Prüfungen und ihr Ergebnis
 * zählt. Läuft sie nicht, steht es LAUT da. Ein stilles Überspringen wäre
 * genau der Zustand, aus dem dieses Skript entstanden ist.
 */

import { execFileSync, spawnSync } from "node:child_process";

function databaseIsReachable() {
  try {
    const names = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return names.split("\n").some((name) => name.startsWith("supabase_db_"));
  } catch {
    return false;
  }
}

if (!databaseIsReachable()) {
  console.log(
    "\n" +
      "############################################################\n" +
      "#  DATENBANKPRUEFUNGEN UEBERSPRUNGEN                       #\n" +
      "#                                                          #\n" +
      "#  Docker oder der Supabase-Stapel laeuft nicht. Die 88     #\n" +
      "#  pgTAP-Suiten sind damit NICHT geprueft - und genau dort  #\n" +
      "#  stehen die Zusagen ueber Sichtbarkeit und Einwilligung.  #\n" +
      "#                                                          #\n" +
      "#  Vor dem Mergen einer Migration:                          #\n" +
      "#      npx supabase start && npm run db:test                #\n" +
      "############################################################\n"
  );
  process.exit(0);
}

const result = spawnSync("npx", ["supabase", "test", "db"], {
  cwd: new URL("../../", import.meta.url).pathname,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
