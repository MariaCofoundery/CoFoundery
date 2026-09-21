/**
 * Die Fragen des Gesprächsleitfadens einmal vorlesen lassen.
 *
 * WARUM VORAB UND NICHT ZUR LAUFZEIT, und das ist keine Sparsamkeit: Die
 * Stimme braucht rund zwanzig Sekunden für einen Satz (gemessen am 21.09.2026:
 * 8,5 Sekunden Audio in 19 Sekunden Rechenzeit), und die fertige Datei verfällt
 * nach 24 Stunden. Wer eine Frage lesen will, wartet nicht zwanzig Sekunden -
 * und niemand soll dieselbe Frage tausendmal neu erzeugen lassen.
 *
 * Der Katalog steht fest. Also: einmal erzeugen, bei uns ablegen, ausliefern.
 * Im Betrieb entsteht dadurch KEIN einziger Aufruf beim Stimmdienst - und es
 * geht auch kein Wort von Nutzern dorthin.
 *
 * DER SCHLÜSSEL BLEIBT AUF DEM RECHNER, auf dem dieses Skript läuft. Er muss
 * nie zu Vercel, weil zur Laufzeit nichts erzeugt wird. Das ist der eigentliche
 * Gewinn dieser Bauweise.
 *
 * AUFRUF:
 *
 *   AICAPELLA_API_KEY=... AICAPELLA_VOICE_ID=... npm run tts:build
 *
 * oder beides in `web/.env.local`. Ohne Schlüssel tut das Skript nichts und
 * sagt das - "nicht eingerichtet" heißt hier wie überall "stumm, nicht kaputt".
 *
 * NUR WAS SICH GEÄNDERT HAT. Das Verzeichnis merkt sich je Text einen Hash;
 * ein unveränderter Satz wird nicht neu erzeugt. Sonst kostete jede
 * Rechtschreibkorrektur zwanzig Minuten und ein Guthaben.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.AICAPELLA_API_URL?.trim() || "https://backstage.aicappella.com/api/tts/v1";
const KEY = process.env.AICAPELLA_API_KEY?.trim() ?? "";
const VOICE = process.env.AICAPELLA_VOICE_ID?.trim() ?? "";

const LOCALES = (process.env.TTS_LOCALES?.trim() || "de").split(",").map((l) => l.trim());
const OUT_DIR = "public/audio/interview";
const MANIFEST = "src/features/capability/interviewAudioManifest.json";

/** Grenzen des Dienstes: 300 Zeichen je Abschnitt, 20 Abschnitte je Auftrag. */
const MAX_SEGMENT = 300;

/**
 * Hoechstens so viele Texte je Lauf. Ohne Begrenzung ganz durch.
 *
 * Fuer den Probelauf: Ein vollstaendiger Durchgang sind rund zwanzig Minuten
 * und zweiunddreissig Auftraege - das will man nicht ausprobieren, sondern
 * einmal richtig machen.
 */
const LIMIT = Number(process.env.TTS_LIMIT ?? "0") || Infinity;

/**
 * Ein Eintrag je Text.
 *
 * `mp3` ist das, was ausgeliefert wird - und nur das steht in der Oberflaeche
 * zur Verfuegung. `wav` ist der lokale Zwischenspeicher: Er ist ignoriert
 * (siehe .gitignore), bleibt aber liegen, damit ein spaeterer Lauf daraus ein
 * MP3 machen kann, ohne den Text noch einmal rendern zu lassen. Ein Rendering
 * kostet zwanzig Sekunden und ein Stueck Guthaben; eine Umwandlung kostet
 * nichts.
 */
type ManifestEntry = { hash: string; seconds: number; wav: string; mp3?: string };
type Manifest = Record<string, Record<string, ManifestEntry>>;

function hashOf(text: string) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * Lange Texte in Abschnitte, an Satzgrenzen.
 *
 * Mitten im Satz zu trennen hört man: Der Dienst rendert jeden Abschnitt für
 * sich, und an der Nahtstelle entsteht eine Pause.
 */
function toSegments(text: string): string[] {
  if (text.length <= MAX_SEGMENT) return [text];
  const sentences = text.split(/(?<=[.!?–])\s+/);
  const segments: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > MAX_SEGMENT) {
      if (current) segments.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }
  if (current) segments.push(current.trim());
  return segments.slice(0, 20);
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${KEY}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response;
}

/** Ein Auftrag, bis die Datei da ist. */
async function render(text: string): Promise<{ wav: Buffer; seconds: number }> {
  const created = (await (
    await api("/jobs", {
      method: "POST",
      body: JSON.stringify({
        voice_id: VOICE,
        segments: toSegments(text).map((segment) => ({ text: segment })),
      }),
    })
  ).json()) as { job_id?: string };

  // Die Antwort nennt `job_id` - die Dokumentation sagt "id", und unter `/jobs`
  // ohne Kennung liefert der Dienst die ganze LISTE. Wer das verwechselt,
  // laedt froehlich eine Fehlermeldung als WAV herunter (99 Bytes, am
  // 21.09.2026 genau so passiert).
  const jobId = created.job_id;
  if (!jobId) throw new Error("keine job_id in der Antwort");

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const job = (await (await api(`/jobs/${jobId}`)).json()) as {
      status?: string;
      audio?: { duration_seconds?: number };
    };
    if (job.status === "succeeded") {
      const audio = Buffer.from(await (await api(`/jobs/${jobId}/audio`)).arrayBuffer());
      // Eine Fehlermeldung ist kein WAV. Der Kopf einer RIFF-Datei beginnt mit
      // "RIFF" - ohne diese Pruefung landet JSON als Tondatei im Verzeichnis.
      if (audio.subarray(0, 4).toString("ascii") !== "RIFF") {
        throw new Error("die Antwort ist kein WAV");
      }
      return { wav: audio, seconds: job.audio?.duration_seconds ?? 0 };
    }
    if (job.status === "failed") throw new Error("der Dienst hat abgebrochen");
  }
  throw new Error("Zeitueberschreitung");
}

function canRun(command: string, args: string[]) {
  try {
    execFileSync(command, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Zwei moegliche Encoder, und `lame` steht zuerst.
 *
 * Nicht aus Geschmack: `brew install ffmpeg` zieht ein halbes Gigabyte
 * Abhaengigkeiten nach, `brew install lame` ist ein Megabyte. Fuer "WAV zu
 * MP3" ist ffmpeg ein Presslufthammer.
 */
const ENCODER = canRun("lame", ["--version"])
  ? "lame"
  : canRun("ffmpeg", ["-version"])
    ? "ffmpeg"
    : null;

/**
 * WAV ist zu groß fürs Ausliefern.
 *
 * Gemessen: 8,5 Sekunden Sprache sind 409 KB als WAV und rund 50 KB als MP3.
 * Zweiunddreißig Texte je Sprache wären also 13 MB gegen 1,6 MB - das ist der
 * Unterschied zwischen "geht ins Repository" und "geht nicht".
 *
 * MP3 und nicht Opus, obwohl Opus kleiner wäre: Diese Dateien sollen auf einem
 * iPhone im Startbildschirm-Modus abspielen, und MP3 spielt überall.
 *
 * Ohne ffmpeg bleibt es WAV - mit einer Warnung. Lieber große Dateien als
 * keine Stimme.
 */
function toMp3(target: string): string | undefined {
  if (!ENCODER) return undefined;
  if (ENCODER === "lame") {
    // -m m: Mono. -b 48: 48 kbit/s - fuer Sprache reichlich.
    execFileSync("lame", ["--quiet", "-m", "m", "-b", "48", `${target}.wav`, `${target}.mp3`]);
  } else {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `${target}.wav`,
      "-codec:a", "libmp3lame", "-b:a", "48k", "-ac", "1", `${target}.mp3`]);
  }
  return `${target.split("/").pop()}.mp3`;
}

/** Welche Texte gesprochen werden - und unter welchem Schlüssel sie liegen. */
function textsFor(locale: string): { key: string; text: string }[] {
  const bundle = JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
    interview: {
      questions: Record<string, { title: string; hint: string; followUps: Record<string, string> }>;
    };
  };

  const texts: { key: string; text: string }[] = [];
  for (const [id, question] of Object.entries(bundle.interview.questions)) {
    texts.push({ key: `${id}.title`, text: question.title });
    texts.push({ key: `${id}.hint`, text: question.hint });
    for (const [followUpId, followUp] of Object.entries(question.followUps)) {
      texts.push({ key: `${id}.followUps.${followUpId}`, text: followUp });
    }
  }
  return texts;
}

async function main() {
  if (!KEY || !VOICE) {
    console.log(
      "Nicht eingerichtet: AICAPELLA_API_KEY und AICAPELLA_VOICE_ID fehlen.\n" +
        "Beides gehoert in web/.env.local. Es wird nichts erzeugt - die Oberflaeche\n" +
        "zeigt dann einfach keinen Vorlese-Knopf."
    );
    return;
  }

  if (!ENCODER) {
    console.warn(
      "Kein MP3-Encoder gefunden. Die Stimme wird trotzdem erzeugt und als WAV\n" +
        "abgelegt - aber WAV wird NICHT ausgeliefert (zweiunddreissig Texte waeren\n" +
        "rund vierzehn Megabyte), und die Oberflaeche zeigt deshalb keinen\n" +
        "Vorlese-Knopf.\n\n" +
        "  brew install lame\n\n" +
        "Danach dieses Skript noch einmal starten: Es wandelt die vorhandenen\n" +
        "WAV-Dateien um, ohne einen einzigen Auftrag neu zu stellen.\n"
    );
  }

  const manifest: Manifest = existsSync(MANIFEST)
    ? (JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest)
    : {};

  for (const locale of LOCALES) {
    const dir = `${OUT_DIR}/${locale}`;
    mkdirSync(dir, { recursive: true });
    manifest[locale] ??= {};

    const all = textsFor(locale);
    const texts = all.slice(0, LIMIT === Infinity ? undefined : LIMIT);
    console.log(
      `\n${locale}: ${texts.length} von ${all.length} Texten` +
        (LIMIT === Infinity ? "" : "  (TTS_LIMIT gesetzt)")
    );

    for (const { key, text } of texts) {
      const hash = hashOf(text);
      const target = `${dir}/${key.replace(/\./g, "_")}`;
      const known = manifest[locale][key];
      const base = target.split("/").pop() as string;

      // Schon fertig ausgeliefert.
      if (known?.hash === hash && known.mp3 && existsSync(`${dir}/${known.mp3}`)) {
        console.log(`  = ${key}`);
        continue;
      }

      // NUR NOCH UMWANDELN: Das WAV liegt vom letzten Lauf, und jetzt ist ein
      // Encoder da. Kein Rendering, kein Guthaben.
      if (known?.hash === hash && existsSync(`${target}.wav`) && ENCODER) {
        // Die Form vereinheitlichen: Ein Eintrag aus einem aelteren Lauf kann
        // noch andere Felder tragen, und zwei Formen im Verzeichnis waeren
        // zwei Wahrheiten.
        manifest[locale][key] = {
          hash,
          seconds: known.seconds,
          wav: `${base}.wav`,
          mp3: toMp3(target),
        };
        writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
        console.log(`  ~ ${key}  (aus dem Zwischenspeicher)`);
        continue;
      }

      process.stdout.write(`  … ${key}`);
      try {
        const { wav, seconds } = await render(text);
        writeFileSync(`${target}.wav`, wav);
        manifest[locale][key] = { hash, seconds, wav: `${base}.wav`, mp3: toMp3(target) };
        writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
        console.log(`  ${seconds.toFixed(1)}s${ENCODER ? "" : "  (nur WAV - kein Encoder)"}`);
      } catch (error) {
        // Ein Fehlschlag nimmt die uebrigen nicht mit: Beim naechsten Lauf
        // wird nur das Fehlende nachgeholt.
        console.log(`  FEHLER: ${(error as Error).message}`);
      }
    }
  }

  console.log(`\nVerzeichnis: ${MANIFEST}`);
}

await main();
