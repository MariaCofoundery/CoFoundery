import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isLocalSupabaseUrl } from "@/features/auth/devLogin";

/**
 * Ein Testprofil - ausschliesslich lokal.
 *
 * GEWUENSCHT AM 25.09.2026: "Wo ich einfach immer nur so quasi so ein
 * Testprofil haette, was nur lokal liegt, was niemals irgendwie auf Vercel
 * gepusht wird. Dann kann ich naemlich wirklich immer mal Aenderungen sehen,
 * bevor ich sie hochlade."
 *
 * ---------------------------------------------------------------------------
 * DIE SPERRE
 * ---------------------------------------------------------------------------
 *
 * Dieses Skript schreibt mit dem Dienstschluessel und geht damit an der
 * Zeilensicherheit vorbei - es kann also alles. Deshalb steht die Pruefung
 * NICHT auf `NODE_ENV`, sondern auf der Adresse der Datenbank: Es laeuft nur
 * gegen 127.0.0.1 beziehungsweise localhost.
 *
 * Der Unterschied ist wesentlich. `NODE_ENV` ist eine Angabe darueber, wofuer
 * man den Lauf HAELT, und die kann falsch sein - eine vergessene Variable, ein
 * falsches Terminal. Die Adresse ist eine Angabe darueber, wohin geschrieben
 * WIRD. Selbst wenn jemand jede andere Variable falsch setzt, kann dieses
 * Skript die Produktionsdatenbank nicht erreichen.
 *
 * Und es wird nie mitgeliefert: Es liegt unter `scripts/`, wird von keinem
 * Bauteil importiert und landet damit in keinem Bundle. Was Vercel baut, kennt
 * diese Datei nicht.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIE ANTWORTEN AUS DER REGISTRATUR KOMMEN
 * ---------------------------------------------------------------------------
 *
 * Der Selbstbericht wird aus echten Antworten gerechnet, nicht aus einem
 * abgelegten Ergebnis. Ein Testprofil mit ausgedachten Antwortwerten waere
 * deshalb entweder leer oder falsch. Dieses Skript nimmt die aktiven Items aus
 * derselben Registratur, die auch der Fragebogen benutzt, und speichert ueber
 * dieselben Abbildungsfunktionen - damit ist das Testprofil so echt wie ein
 * ausgefuellter Fragebogen und laeuft nicht auseinander, wenn sich der
 * Fragebogen aendert.
 */

const TEST_EMAIL = "dev@cofoundery.local";
const TEST_PASSWORD = "cofoundery-local-only";

function requireLocalStack(): { url: string; anonKey: string; serviceKey: string } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY und " +
        "SUPABASE_SERVICE_ROLE_KEY fehlen. Sie stehen in web/.env.local - das " +
        "Skript liest sie ueber --env-file-if-exists."
    );
  }

  // Dieselbe Pruefung wie die Entwicklungs-Anmeldung - eine Sperre, zwei
  // Benutzer. Zwei Fassungen derselben Regel laufen irgendwann auseinander.
  if (!isLocalSupabaseUrl(url)) {
    throw new Error(
      [
        "",
        "  ABGEBROCHEN. Dieses Skript schreibt nur in eine lokale Datenbank.",
        "",
        `  NEXT_PUBLIC_SUPABASE_URL zeigt auf: ${url}`,
        "  Erlaubt sind ausschliesslich: 127.0.0.1, localhost, ::1",
        "",
        "  Wenn du gerade gegen die echte Datenbank entwickelst, ist das kein",
        "  Fehler des Skripts, sondern seine Aufgabe.",
        "",
      ].join("\n")
    );
  }

  return { url, anonKey, serviceKey };
}

/**
 * Anlegen oder wiederfinden - das Skript darf beliebig oft laufen.
 *
 * UEBER DIE NORMALE REGISTRIERUNG, NICHT UEBER DIE VERWALTUNGS-API.
 *
 * Am 26.09.2026 scheiterte der erste Lauf an
 * `auth.admin.createUser`: "signing method HS256 is invalid". Der lokale
 * Stack laeuft mit GoTrue v2.187, und diese Fassung nimmt die alten
 * HS256-Schluessel an den Verwaltungsendpunkten nicht mehr an - weder den
 * `service_role`-JWT noch den neuen `sb_secret`-Schluessel, den `supabase
 * status` daneben ausgibt.
 *
 * Der Umweg ist kein Notbehelf, sondern der bessere Weg: Lokal steht
 * `enable_signup = true` und `enable_confirmations = false`, eine
 * Registrierung ist damit sofort bestaetigt. Dieses Skript braucht also
 * ueberhaupt keine Verwaltungsrechte, um ein Konto anzulegen - und es haengt
 * nicht mehr daran, welche Schluesselart der lokale Stack gerade erwartet.
 *
 * Fuer die DATEN weiter unten bleibt der Dienstschluessel noetig, weil sie an
 * der Zeilensicherheit vorbei geschrieben werden. Dort funktioniert er auch:
 * PostgREST nimmt ihn an, nur GoTrue nicht.
 */
async function ensureTestUser(anon: SupabaseClient): Promise<string> {
  const signedUp = await anon.auth.signUp({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (signedUp.data.user?.id) return signedUp.data.user.id;

  // Schon da. Dann ist die Anmeldung die Antwort auf die Frage nach der
  // Kennung - und sie bestaetigt gleich, dass /dev-login funktionieren wird.
  const signedIn = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signedIn.data.user?.id) return signedIn.data.user.id;

  throw new Error(
    [
      `Das Testkonto ${TEST_EMAIL} gibt es, aber das Passwort passt nicht.`,
      "Ohne Verwaltungsrechte laesst es sich von hier nicht zuruecksetzen.",
      "",
      "  Loeschen und neu anlegen:",
      "    npx supabase db reset      (wirft ALLE lokalen Daten weg)",
      "",
      `  Oder das Konto direkt entfernen:`,
      `    delete from auth.users where email = '${TEST_EMAIL}';`,
    ].join("\n")
  );
}

/** Wer die Person ist. */
async function seedPersonCore(admin: SupabaseClient, userId: string) {
  const { error } = await admin.from("person_core").upsert(
    {
      user_id: userId,
      display_name: "Nora Testerin",
      headline: "Baut Werkzeuge für Pflegeteams",
      bio: "Zehn Jahre zwischen Klinik-IT und Produkt. Ich mag Probleme, bei denen man mit den Betroffenen sprechen muss, bevor man irgendetwas baut.",
      location_region: "Leipzig",
      remote_mode: "hybrid",
      expertise: ["Produktentdeckung", "Nutzerforschung", "Health-IT"],
      industries: ["Gesundheit", "B2B-Software"],
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

/**
 * Was sie mitbringt - quer ueber mehrere Familien, damit die Deckungskarte
 * etwas zu zeigen hat und nicht nur eine Familie eingefaerbt ist.
 *
 * Absichtlich UNGLEICH weit beantwortet: ein Bereich ohne Stufe, einer mit
 * Stufe aber ohne Verantwortungswunsch. Sonst zeigt die Karte nur eine einzige
 * Farbe, und man sieht beim Bauen nicht, ob die anderen stimmen.
 */
const CAPABILITY_ENTRIES: {
  areaId: string;
  level: number | null;
  wish: string | null;
  evidence?: string;
}[] = [
  { areaId: "customer_discovery", level: 5, wish: "own", evidence: "Vierzig Gespräche auf Station geführt, bevor die erste Zeile Code entstand." },
  { areaId: "user_research", level: 4, wish: "own", evidence: "Reihe von Beobachtungsterminen im Nachtdienst, daraus drei Personas verworfen." },
  { areaId: "product_discovery", level: 4, wish: "contribute" },
  { areaId: "product_management", level: 3, wish: "contribute", evidence: "Ein Jahr Roadmap für ein Team aus fünf Leuten verantwortet." },
  { areaId: "positioning", level: 3, wish: "grow_into" },
  // Stufe da, Verantwortung noch offen.
  { areaId: "software_engineering", level: 2, wish: null },
  { areaId: "data_protection", level: 3, wish: "prefer_external" },
  { areaId: "financial_planning", level: 2, wish: "prefer_other" },
  // Nur genannt, noch ohne Stufe.
  { areaId: "recruiting", level: null, wish: null },
];

async function seedCapability(admin: SupabaseClient, userId: string) {
  for (const entry of CAPABILITY_ENTRIES) {
    const { data, error } = await admin
      .from("person_capability_entries")
      .upsert(
        {
          user_id: userId,
          area_id: entry.areaId,
          application_level: entry.level,
          ownership_wish: entry.wish,
        },
        { onConflict: "user_id,area_id" }
      )
      .select("id")
      .single();
    if (error) throw error;

    if (!entry.evidence) continue;
    // Belege haben keinen eindeutigen Schluessel - erst leeren, dann setzen,
    // damit ein zweiter Lauf sie nicht verdoppelt.
    await admin.from("person_capability_evidence").delete().eq("entry_id", data.id);
    const { error: evidenceError } = await admin
      .from("person_capability_evidence")
      .insert({ entry_id: data.id, narrative: entry.evidence });
    if (evidenceError) throw evidenceError;
  }
}

/** Wie sie arbeitet - mit Selbst- und vermuteter Aussensicht. */
const STRENGTHS = [
  { statement: "Fragt nach, bevor sie eine Lösung vorschlägt", self: "often", reflected: "almost_always", who: "former_colleagues" },
  { statement: "Bleibt an einem Thema dran, auch wenn es zäh wird", self: "almost_always", reflected: "often", who: "managers" },
  { statement: "Sagt früh, wenn etwas nicht aufgeht", self: "sometimes", reflected: "often", who: "current_colleagues" },
  // Einer ohne Aussensicht - die Anzeige muss auch das aushalten.
  { statement: "Macht Entscheidungen schriftlich nachvollziehbar", self: "often", reflected: null, who: null },
];

async function seedStrengths(admin: SupabaseClient, userId: string) {
  await admin.from("person_strengths").delete().eq("user_id", userId);
  const { error } = await admin.from("person_strengths").insert(
    STRENGTHS.map((strength) => ({
      user_id: userId,
      statement: strength.statement,
      origin: "own_words",
      self_frequency: strength.self,
      reflected_frequency: strength.reflected,
      reflected_who: strength.who,
    }))
  );
  if (error) throw error;
}

/** Wohin sie will. */
const DIRECTION = [
  { facet: "recurring_theme", statement: "Arbeit, die an Menschen hängt, verlässlicher machen", confidence: "recurring" },
  { facet: "problem_cared_about", statement: "Pflegeteams verlieren Zeit an Dokumentation, die niemand liest", confidence: "one_example" },
  { facet: "people_cared_about", statement: "Leute, die im Schichtdienst arbeiten", confidence: "stated" },
  { facet: "desired_change", statement: "Weniger Übergabefehler zwischen Tag- und Nachtdienst", confidence: "one_example" },
  { facet: "energising_activity", statement: "Mit Betroffenen an einem Tisch ein Problem auseinandernehmen", confidence: "recurring" },
];

async function seedDirection(admin: SupabaseClient, userId: string) {
  await admin.from("direction_statements").delete().eq("user_id", userId);
  const { error } = await admin.from("direction_statements").insert(
    DIRECTION.map((statement) => ({
      user_id: userId,
      facet: statement.facet,
      statement: statement.statement,
      confidence: statement.confidence,
      origin: "own_words",
    }))
  );
  if (error) throw error;
}

/**
 * Der Fragebogen - vollstaendig aus der Datenbank.
 *
 * ZWEI FEHLSCHLAEGE AM 26.09.2026 FUEHRTEN HIERHER, und der zweite ist der
 * lehrreiche:
 *
 *   Erst brach der Lauf an `base_choice_value_not_found_for_question` ab. Ein
 *   Ausloeser prueft, dass jede Antwort auf eine wirklich vorhandene Zeile in
 *   `public.choices` zeigt.
 *
 *   Dann zeigte sich der Grund: Die Registratur kennt Kennungen wie
 *   `q01_vision_l1`, die Fragentabelle dieser Datenbank aber `D1_Q1`. Zwei
 *   Kennungsschemata nebeneinander - und das Skript hatte sich das falsche
 *   ausgesucht.
 *
 * DESHALB FRAGT ES JETZT NUR NOCH DIE DATENBANK. Welche Fragen zum Fragebogen
 * gehoeren, welche Antworten gueltig sind: beides steht dort, und dort steht
 * es richtig. Ein Testprofil, das seine eigene Vorstellung davon mitbringt,
 * ist genau so lange richtig, bis sich eine der beiden Seiten aendert.
 *
 * Die Wahl faellt deterministisch, aber nicht immer auf dieselbe Stelle: Wer
 * jede Frage gleich beantwortet, bekommt ein Profil ohne jede Auspraegung,
 * und dann steht im Bericht ueberall "ausgewogen" - man saehe beim Bauen
 * nicht, ob die Textbausteine funktionieren.
 */
const BASE_QUESTION_CATEGORY = "basis";

async function seedBaseAssessment(admin: SupabaseClient, userId: string) {
  const { data: questionRows, error: questionError } = await admin
    .from("questions")
    .select("id, sort_order")
    .eq("category", BASE_QUESTION_CATEGORY)
    .eq("is_active", true)
    .order("sort_order");
  if (questionError) throw questionError;

  const questionIds = (questionRows ?? []).map((row) => (row as { id: string }).id);
  if (questionIds.length === 0) {
    throw new Error(
      "Keine aktiven Fragen in der Datenbank - sind die Migrationen eingespielt? " +
        "`npx supabase migration up --local`"
    );
  }

  const { data: choiceRows, error: choiceError } = await admin
    .from("choices")
    .select("question_id, value, sort_order")
    .in("question_id", questionIds)
    .order("sort_order");
  if (choiceError) throw choiceError;

  const choicesByQuestion = new Map<string, string[]>();
  for (const row of (choiceRows ?? []) as { question_id: string; value: string }[]) {
    const list = choicesByQuestion.get(row.question_id) ?? [];
    list.push(row.value);
    choicesByQuestion.set(row.question_id, list);
  }

  await admin.from("assessments").delete().eq("user_id", userId).eq("module", "base");
  const { data: assessment, error } = await admin
    .from("assessments")
    .insert({ user_id: userId, module: "base" })
    .select("id")
    .single();
  if (error) throw error;

  const answers = questionIds
    .map((questionId, index) => {
      const values = choicesByQuestion.get(questionId) ?? [];
      if (values.length === 0) return null;
      return {
        assessment_id: assessment.id,
        question_id: questionId,
        choice_value: values[index % values.length],
      };
    })
    .filter((answer): answer is NonNullable<typeof answer> => answer !== null);

  if (answers.length === 0) {
    throw new Error("Keine Frage hat Antwortmoeglichkeiten - die Fragentabelle ist unvollstaendig.");
  }

  const { error: answerError } = await admin
    .from("assessment_answers")
    .upsert(answers, { onConflict: "assessment_id,question_id" });
  if (answerError) throw answerError;

  const { error: submitError } = await admin
    .from("assessments")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", assessment.id);
  if (submitError) throw submitError;

  return { written: answers.length, skipped: questionIds.length - answers.length };
}

async function main() {
  const { url, anonKey, serviceKey } = requireLocalStack();
  // Zwei Verbindungen mit verschiedenen Rechten: Die eine registriert wie ein
  // normaler Mensch, die andere schreibt die Daten an der Zeilensicherheit
  // vorbei. Beides mit einem Schluessel zu machen ginge nicht - und waere
  // auch nicht richtig.
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userId = await ensureTestUser(anon);
  await seedPersonCore(admin, userId);
  await seedCapability(admin, userId);
  await seedStrengths(admin, userId);
  await seedDirection(admin, userId);
  const assessment = await seedBaseAssessment(admin, userId);

  console.log(
    [
      "",
      "  Testprofil steht - nur in der lokalen Datenbank.",
      "",
      `    E-Mail:    ${TEST_EMAIL}`,
      `    Passwort:  ${TEST_PASSWORD}`,
      `    Kennung:   ${userId}`,
      "",
      `    ${CAPABILITY_ENTRIES.length} Fähigkeitsbereiche, ${STRENGTHS.length} Arbeitsweisen,`,
      `    ${DIRECTION.length} Richtungs-Aussagen, ${assessment.written} Fragebogen-Antworten` +
        (assessment.skipped > 0 ? ` (${assessment.skipped} ohne Entsprechung uebersprungen).` : "."),
      "",
      "  Anmelden:  http://localhost:3000/dev-login",
      "  Ansehen:   http://localhost:3000/me/profile",
      "",
    ].join("\n")
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
