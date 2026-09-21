/**
 * Der Arbeiter. Laeuft auf dem Laptop, nicht in der Cloud.
 *
 *   npm run ai:worker
 *
 * WAS ER TUT: alle paar Sekunden bei der Datenbank nachfragen, ob Arbeit
 * daliegt, sie erledigen und das Ergebnis zurueckschreiben. Dazu alle dreissig
 * Sekunden ein Lebenszeichen, aus dem die Anzeige "KI verfuegbar" entsteht.
 *
 * DIE RICHTUNG IST DIE SICHERHEIT: Er ruft heraus, niemand ruft herein. Es gibt
 * keinen offenen Port, keinen Tunnel und keinen Endpunkt, den ein Fremder
 * ansprechen koennte. Wird der Laptop zugeklappt, liegt die Arbeit weiter in
 * der Schlange.
 *
 * ER HAT KEINEN SERVICE-ROLE-SCHLUESSEL. Er meldet sich mit einem eigenen
 * Konto an, das in `ai_workers` steht, und darf damit genau dreierlei: eine
 * Aufgabe abholen, sie abschliessen, ein Lebenszeichen setzen. Er kann die
 * Warteschlange nicht einmal LESEN - ein pgTAP-Test haelt das fest. Geht das
 * Notebook verloren, ist der Schaden darauf begrenzt.
 *
 * WAS ER BRAUCHT (in web/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY   - wie die App
 *   AI_WORKER_EMAIL, AI_WORKER_PASSWORD                       - das eigene Konto
 *   AI_MODEL, OLLAMA_URL                                      - optional
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { extractResources } from "@/features/ai/resourceExtraction";
import { getAiModel, isModelReachable } from "@/lib/ai/ollama";

/** Wie oft nachgefragt wird, wenn nichts daliegt. */
const IDLE_POLL_MS = 5_000;
/** Ein Lebenszeichen alle dreissig Sekunden; die Anzeige gibt zwei Minuten Nachlauf. */
const HEARTBEAT_MS = 30_000;

/**
 * Die Fassung des Prompts. Wird an der Aufgabe festgehalten, damit spaeter
 * erklaerbar ist, warum ein altes Ergebnis anders aussieht als ein neues.
 * Bei jeder inhaltlichen Aenderung an einem Prompt eins hoeher.
 */
const PROMPT_VERSION = 1;

type AiJob = {
  id: string;
  job_type: string;
  subject_user_id: string;
  source_table: string | null;
  source_id: string | null;
  attempts: number;
};

/**
 * Fehlerschluessel. KEINE Meldungen: Ein Modelltext oder ein Ausschnitt aus
 * einem Lebenslauf hat in einer Fehlerspalte nichts zu suchen, und der
 * Constraint auf `ai_jobs.error_code` laesst dort ohnehin nur Schluessel zu.
 */
type ErrorCode = "model_unreachable" | "model_unusable_answer" | "source_missing" | "unknown_job_type";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} fehlt in web/.env.local`);
    process.exit(1);
  }
  return value;
}

async function signIn(): Promise<SupabaseClient> {
  const client = createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: true, persistSession: false } }
  );

  const { error } = await client.auth.signInWithPassword({
    email: required("AI_WORKER_EMAIL"),
    password: required("AI_WORKER_PASSWORD"),
  });

  if (error) {
    console.error("Anmeldung des Arbeiterkontos fehlgeschlagen.");
    process.exit(1);
  }

  return client;
}

/**
 * Erledigt eine Aufgabe.
 *
 * Gibt einen Fehlerschluessel zurueck, wenn es nicht geklappt hat - oder null
 * bei Erfolg. Wirft nicht: Ein Absturz hier wuerde die Aufgabe auf "laufend"
 * stehen lassen, bis die zehn Minuten abgelaufen sind.
 */
async function runJob(client: SupabaseClient, job: AiJob): Promise<ErrorCode | null> {
  switch (job.job_type) {
    case "ping": {
      // Prueft die Kette Anwendung -> Schlange -> Arbeiter -> Modell -> zurueck,
      // ohne eine einzige Personendatei anzufassen. Deshalb bleibt sie auch
      // dauerhaft: Wer wissen will, ob alles steht, soll das nicht an echten
      // Daten ausprobieren muessen.
      return (await isModelReachable(5_000)) ? null : "model_unreachable";
    }
    case "connect_resource_extraction": {
      // Der Text kommt aus einer engen Funktion, nicht aus der Tabelle: Der
      // Arbeiter darf `network_listings` nicht lesen und soll es auch nicht.
      // Er bekommt genau den einen Text, zu dem er eine Aufgabe in der Hand
      // hat - und nur, solange sie laeuft und der Text veroeffentlicht ist.
      const { data: sourceText, error } = await client.rpc("get_ai_job_source_text", {
        p_job_id: job.id,
      });
      if (error) return "source_missing";
      if (typeof sourceText !== "string" || sourceText.trim().length < 40) {
        // Zurueckgezogen, geloescht oder zu kurz, um etwas daraus zu lesen.
        return "source_missing";
      }

      const proposals = await extractResources(sourceText, getAiModel());
      if (proposals === null) return "model_unreachable";

      // Jeder Vorschlag geht einzeln hinein, und die Datenbank prueft das
      // Zitat noch einmal gegen die Quelle. Ein abgelehnter nimmt die anderen
      // nicht mit - er war nur nicht belegbar.
      for (const proposal of proposals) {
        await client.rpc("insert_ai_resource_proposal", {
          p_job_id: job.id,
          p_kind: proposal.kind,
          p_label: proposal.label,
          p_quote: proposal.quote,
          p_model: getAiModel(),
          p_prompt_version: PROMPT_VERSION,
        });
      }

      // Kein Fund ist ein gueltiges Ergebnis: Nicht in jedem Text steht ein
      // Zugang. Die Aufgabe gilt als erledigt, damit sie nicht wiederkommt.
      return null;
    }

    default:
      // Eine Art, die dieses Skript nicht kennt, ist kein Grund für fünf
      // Anläufe. Sie gehört einer neueren Fassung des Arbeiters.
      return "unknown_job_type";
  }
}

async function main() {
  const client = await signIn();
  const model = getAiModel();
  let stopping = false;

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      stopping = true;
      console.log("\nHalte an. Laufende Aufgaben kommen nach zehn Minuten von selbst zurück in die Schlange.");
    });
  }

  // Das Lebenszeichen laeuft unabhaengig von der Arbeit: Es sagt "dieser
  // Rechner ist da", nicht "dieser Rechner hat gerade etwas zu tun".
  const beat = async () => {
    const reachable = await isModelReachable(2_000);
    // Nur wenn das MODELL laeuft. Ein Arbeiter ohne Modell koennte nichts
    // erledigen, und die Anzeige waere ein falsches Versprechen.
    if (!reachable) return;
    await client.rpc("record_ai_worker_heartbeat", { p_model: model });
  };

  await beat();
  const heartbeat = setInterval(() => void beat(), HEARTBEAT_MS);

  console.log(`Arbeiter läuft. Modell: ${model}. Beenden mit Strg-C.`);

  while (!stopping) {
    const { data, error } = await client.rpc("claim_ai_job");
    if (error) {
      console.error("Abholen fehlgeschlagen:", error.code ?? "unbekannt");
      await new Promise((resolve) => setTimeout(resolve, IDLE_POLL_MS));
      continue;
    }

    // Die Funktion gibt bei leerer Schlange eine Zeile aus Nullwerten zurueck.
    const job = (data ?? null) as AiJob | null;
    if (!job?.id) {
      await new Promise((resolve) => setTimeout(resolve, IDLE_POLL_MS));
      continue;
    }

    const startedAt = Date.now();
    const failure = await runJob(client, job).catch((): ErrorCode => "model_unusable_answer");
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    if (failure) {
      await client.rpc("fail_ai_job", { p_job_id: job.id, p_error_code: failure });
      // Nur die Art und der Schluessel. KEIN Inhalt, kein Ausschnitt, keine
      // Kennung der Person - ein Terminalfenster ist auch ein Logfile.
      console.log(`✗ ${job.job_type} (${seconds}s) ${failure}, Versuch ${job.attempts}`);
      continue;
    }

    await client.rpc("complete_ai_job", {
      p_job_id: job.id,
      p_model: model,
      p_prompt_version: PROMPT_VERSION,
    });
    console.log(`✓ ${job.job_type} (${seconds}s)`);
  }

  clearInterval(heartbeat);
  await client.auth.signOut();
}

await main();
