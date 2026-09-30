import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isLocalSupabaseUrl } from "@/features/auth/devLogin";
import { FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";

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

const TEST_PASSWORD = "cofoundery-local-only";

/**
 * Eine kleine Welt statt eines einzelnen Kontos.
 *
 * ERWEITERT AM 26.09.2026. Ein einzelnes Profil zeigte das Gesamtbild - aber
 * nichts von dem, was danach entstanden ist: Freigaben haben zwei Seiten,
 * eine gemeinsame Auswertung braucht mehrere Menschen, und eine offene
 * Anfrage sieht man nur, wenn jemand sie gestellt hat.
 *
 * Deshalb drei Foundernde und eine Advisorin mit Organisation. Wer welche
 * Seite sehen will, meldet sich unter /dev-login als die entsprechende
 * Person an.
 */
const FOUNDER_EMAIL = "dev@cofoundery.local";
const SECOND_EMAIL = "ben@cofoundery.local";
const THIRD_EMAIL = "carla@cofoundery.local";
const ADVISOR_EMAIL = "advisor@cofoundery.local";

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
async function ensureTestUser(anon: SupabaseClient, email: string): Promise<string> {
  const signedUp = await anon.auth.signUp({ email, password: TEST_PASSWORD });
  if (signedUp.data.user?.id) return signedUp.data.user.id;

  // Schon da. Dann ist die Anmeldung die Antwort auf die Frage nach der
  // Kennung - und sie bestaetigt gleich, dass /dev-login funktionieren wird.
  const signedIn = await anon.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (signedIn.data.user?.id) return signedIn.data.user.id;

  throw new Error(
    [
      `Das Testkonto ${email} gibt es, aber das Passwort passt nicht.`,
      "Ohne Verwaltungsrechte laesst es sich von hier nicht zuruecksetzen.",
      "",
      "  Loeschen und neu anlegen:",
      "    npx supabase db reset      (wirft ALLE lokalen Daten weg)",
      "",
      `  Oder das Konto direkt entfernen:`,
      `    delete from auth.users where email = '${email}';`,
    ].join("\n")
  );
}

/** Wer die Person ist. */
type PersonSeed = {
  displayName: string;
  headline: string;
  bio: string;
  locationRegion: string;
  expertise: string[];
  industries: string[];
};

async function seedPersonCore(admin: SupabaseClient, userId: string, person: PersonSeed) {
  const { error } = await admin.from("person_core").upsert(
    {
      user_id: userId,
      display_name: person.displayName,
      headline: person.headline,
      bio: person.bio,
      location_region: person.locationRegion,
      remote_mode: "hybrid",
      expertise: person.expertise,
      industries: person.industries,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

/**
 * Die Rolle - und damit der Zugang.
 *
 * ---------------------------------------------------------------------------
 * OHNE DIESE ZEILE IST DIE TESTWELT KEINE FOUNDER-WELT
 * ---------------------------------------------------------------------------
 *
 * `has_founder_assessment_access()` fragt nach einem Eintrag in `profiles` mit
 * der Rolle `founder`. Fehlt er, weist die Zeilensicherheit JEDEN Schreibweg
 * an `assessments` ab - der Fragebogen laedt, die Fragen stehen da, und beim
 * Speichern kommt eine rote Meldung. Genau so gemeldet am 29.09.2026:
 * „Als Lokal kann ich mir das gerade leider nicht angucken, da gibt es
 * irgendwie Fehler.“
 *
 * `person_core` allein reicht dafuer nicht. Es beschreibt den Menschen, nicht
 * seine Rolle im Produkt - und die Policies fragen nach der Rolle.
 *
 * Die Rollen stehen hier AUSDRUECKLICH und nicht ueber den Spaltenvorgabewert
 * `{founder}`: Pia ist Advisorin, und ein Vorgabewert haette sie stillschweigend
 * zur Founderin gemacht.
 */
async function seedProfile(
  admin: SupabaseClient,
  userId: string,
  displayName: string,
  roles: string[],
) {
  const { error } = await admin.from("profiles").upsert(
    { user_id: userId, display_name: displayName, roles, updated_at: new Date().toISOString() },
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

async function seedCapability(
  admin: SupabaseClient,
  userId: string,
  entries = CAPABILITY_ENTRIES
) {
  for (const entry of entries) {
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

async function seedStrengths(
  admin: SupabaseClient,
  userId: string,
  strengths = STRENGTHS
) {
  await admin.from("person_strengths").delete().eq("user_id", userId);
  const { error } = await admin.from("person_strengths").insert(
    strengths.map((strength) => ({
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

async function seedDirection(
  admin: SupabaseClient,
  userId: string,
  direction = DIRECTION
) {
  await admin.from("direction_statements").delete().eq("user_id", userId);
  const { error } = await admin.from("direction_statements").insert(
    direction.map((statement) => ({
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

async function seedBaseAssessment(admin: SupabaseClient, userId: string, shift = 0) {
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
        // `shift` verschiebt das Antwortmuster je Person. Ohne ihn saehen
        // alle Testprofile gleich aus, und das Nebeneinander waere eine
        // Reihe uebereinanderliegender Punkte - man saehe nicht, ob es
        // funktioniert.
        choice_value: values[(index + shift) % values.length],
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

/**
 * Das abgelegte Selbstbild - sonst bleibt das Nebeneinander leer.
 *
 * Normalerweise entsteht es, wenn eine Person ihren eigenen Report ansieht
 * (Migration 20261047120000). Im Seed wird es direkt geschrieben: Sonst
 * muesste man sich erst als jede der drei Personen anmelden und ihr Profil
 * oeffnen, bevor die Advisor-Seite ueberhaupt etwas zeigt.
 *
 * DIE WERTE SIND ERFUNDEN, und das ist hier richtig - es ist ein Testprofil,
 * kein Messergebnis. Sie sind je Person verschoben, damit man auf den Achsen
 * drei unterscheidbare Punkte sieht und nicht einen.
 */
async function seedAlignmentSnapshot(admin: SupabaseClient, userId: string, offset: number) {
  const scores: Record<string, number> = {};
  FOUNDER_DIMENSION_ORDER.forEach((dimension, index) => {
    // Zwischen 1 und 5, in kleinen Schritten auseinander.
    const raw = 1.6 + ((index * 1.3 + offset * 1.7) % 3.2);
    scores[dimension] = Math.round(raw * 10) / 10;
  });

  const { error } = await admin.from("person_alignment_snapshots").upsert(
    {
      user_id: userId,
      scores,
      values_status: "not_started",
      basis_answered: 36,
      basis_total: 36,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

/**
 * Die Advisor-Seite: eine Organisation, Freigaben, gemeinsame Auswertungen.
 *
 * ABSICHTLICH IN VERSCHIEDENEN ZUSTAENDEN. Ein Seed, in dem alles zugestimmt
 * ist, zeigt genau die Haelfte, auf die es ankommt, nicht: die offene Frage.
 * Deshalb bleibt eine Freigabe und eine gemeinsame Auswertung unbeantwortet -
 * so sieht man beim Anmelden als Founderin auch die Entscheidungsseite und
 * nicht nur das Ergebnis.
 */
const ALL_SCOPES = [
  "base",
  "capability",
  "capability_depth",
  "strengths",
  "direction",
  "alignment_report",
] as const;

async function seedAdvisorWorld(
  admin: SupabaseClient,
  ids: { founder: string; second: string; third: string; advisor: string }
) {
  // --- Die Organisation ---------------------------------------------------
  await admin.from("advisor_org_members").delete().eq("user_id", ids.advisor);
  await admin.from("advisor_orgs").delete().eq("created_by_user_id", ids.advisor);

  const { data: org, error: orgError } = await admin
    .from("advisor_orgs")
    .insert({
      name: "Beispiel-Accelerator",
      description:
        "Wir begleiten zwoelf Teams im Jahr durch die ersten achtzehn Monate - mit " +
        "woechentlichen Gespraechen, einem festen Budget und ohne Beteiligung.",
      website_url: "https://beispiel.example",
      focus: ["Health", "B2B-Software", "Public"],
      location_region: "Leipzig",
      created_by_user_id: ids.advisor,
    })
    .select("id")
    .single();
  if (orgError) throw orgError;

  const { error: memberError } = await admin
    .from("advisor_org_members")
    .insert({ org_id: org.id, user_id: ids.advisor, role: "owner" });
  if (memberError) throw memberError;

  // --- Die Freigaben ------------------------------------------------------
  await admin
    .from("advisor_person_grants")
    .delete()
    .in("subject_user_id", [ids.founder, ids.second, ids.third]);

  const grants: Record<string, unknown>[] = [];
  for (const subject of [ids.founder, ids.second, ids.third]) {
    for (const scope of ALL_SCOPES) {
      // EINE BLEIBT OFFEN, und zwar bei der Person, als die man sich anmeldet:
      // Sonst sieht man die Entscheidungsseite nie.
      const open = subject === ids.founder && scope === "alignment_report";
      grants.push({
        subject_user_id: subject,
        org_id: org.id,
        scope,
        status: open ? "requested" : "active",
        approved_at: open ? null : new Date().toISOString(),
        requested_by_user_id: ids.advisor,
        request_note: open
          ? "Fuer das Gespraech naechste Woche waere dein Selbstbild hilfreich."
          : null,
      });
    }
  }
  const { error: grantError } = await admin.from("advisor_person_grants").insert(grants);
  if (grantError) throw grantError;

  // --- Zwei gemeinsame Auswertungen --------------------------------------
  await admin.from("advisor_team_reviews").delete().eq("org_id", org.id);

  // Eine, der alle zugestimmt haben - die ist zu sehen.
  const { data: running, error: runningError } = await admin
    .from("advisor_team_reviews")
    .insert({
      org_id: org.id,
      requested_by_user_id: ids.advisor,
      request_note: "Wir wuerden gern ueber eure Rollenverteilung sprechen.",
      status: "active",
      activated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (runningError) throw runningError;

  // Und eine offene - die ist zu entscheiden.
  const { data: pending, error: pendingError } = await admin
    .from("advisor_team_reviews")
    .insert({
      org_id: org.id,
      requested_by_user_id: ids.advisor,
      request_note: "Passt ihr beide zusammen in eine Kohorte?",
    })
    .select("id")
    .single();
  if (pendingError) throw pendingError;

  const decided = new Date().toISOString();
  const { error: reviewMemberError } = await admin.from("advisor_team_review_members").insert([
    { review_id: running.id, subject_user_id: ids.founder, decision: "approved", decided_at: decided },
    { review_id: running.id, subject_user_id: ids.second, decision: "approved", decided_at: decided },
    // Carla hat schon zugestimmt, die eigene Antwort steht noch aus.
    { review_id: pending.id, subject_user_id: ids.third, decision: "approved", decided_at: decided },
    // `decision` ausdruecklich: PostgREST fuellt bei einem Stapel mit
    // unterschiedlichen Objekten die fehlenden Spalten mit null auf,
    // statt die Voreinstellung der Tabelle greifen zu lassen.
    { review_id: pending.id, subject_user_id: ids.founder, decision: "pending", decided_at: null },
  ]);
  if (reviewMemberError) throw reviewMemberError;

  return { orgId: org.id as string };
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

  const founder = await ensureTestUser(anon, FOUNDER_EMAIL);
  const second = await ensureTestUser(anon, SECOND_EMAIL);
  const third = await ensureTestUser(anon, THIRD_EMAIL);
  const advisor = await ensureTestUser(anon, ADVISOR_EMAIL);

  await seedPersonCore(admin, founder, {
    displayName: "Nora Testerin",
    headline: "Baut Werkzeuge für Pflegeteams",
    bio: "Zehn Jahre zwischen Klinik-IT und Produkt. Ich mag Probleme, bei denen man mit den Betroffenen sprechen muss, bevor man irgendetwas baut.",
    locationRegion: "Leipzig",
    expertise: ["Produktentdeckung", "Nutzerforschung", "Health-IT"],
    industries: ["Gesundheit", "B2B-Software"],
  });
  await seedPersonCore(admin, second, {
    displayName: "Ben Testfounder",
    headline: "Technik und Zahlen",
    bio: "Vorher Plattform-Engineering, inzwischen mehr an der Schnittstelle zu Finanzen. Ich baue gern das, was danach noch funktioniert.",
    locationRegion: "Dresden",
    expertise: ["Architektur", "Unit Economics"],
    industries: ["B2B-Software"],
  });
  await seedPersonCore(admin, third, {
    displayName: "Carla Testfounderin",
    headline: "Vertrieb und Partnerschaften",
    bio: "Ich habe zweimal von null auf die ersten Enterprise-Kunden verkauft und finde den Teil am spannendsten, in dem noch nichts steht.",
    locationRegion: "Berlin",
    expertise: ["B2B-Vertrieb", "Partnerschaften"],
    industries: ["B2B-Software", "Public"],
  });
  await seedPersonCore(admin, advisor, {
    displayName: "Pia Beraterin",
    headline: "Begleitet Teams im Beispiel-Accelerator",
    bio: "Seit sechs Jahren im Programm, davor selbst gegründet. Ich frage lieber nach, als Ratschläge zu geben.",
    locationRegion: "Leipzig",
    expertise: ["Programmleitung"],
    industries: ["Gesundheit"],
  });

  // Die Rolle zuerst - ohne sie weist die Zeilensicherheit alles Weitere ab.
  await seedProfile(admin, founder, "Nora Testerin", ["founder"]);
  await seedProfile(admin, second, "Ben Testfounder", ["founder"]);
  await seedProfile(admin, third, "Carla Testfounderin", ["founder"]);
  await seedProfile(admin, advisor, "Pia Beraterin", ["advisor"]);

  // Unterschiedliche Bereiche je Person, damit die Rollenlage etwas zu zeigen
  // hat: Ueberschneidungen, Luecken und offene Stellen.
  await seedCapability(admin, founder);
  await seedCapability(admin, second, [
    { areaId: "software_engineering", level: 5, wish: "own", evidence: "Die Plattform von der ersten Zeile bis zum Betrieb verantwortet." },
    { areaId: "technical_architecture", level: 4, wish: "own" },
    { areaId: "unit_economics", level: 4, wish: "own" },
    { areaId: "financial_planning", level: 3, wish: "contribute" },
    { areaId: "product_management", level: 3, wish: "contribute" },
    { areaId: "data_protection", level: 2, wish: null },
  ]);
  await seedCapability(admin, third, [
    { areaId: "b2b_sales", level: 5, wish: "own", evidence: "Zweimal von null auf die ersten Enterprise-Kunden." },
    { areaId: "partnerships", level: 4, wish: "own" },
    { areaId: "positioning", level: 4, wish: "own" },
    { areaId: "marketing_brand", level: 3, wish: "contribute" },
    { areaId: "customer_discovery", level: 3, wish: "contribute" },
    { areaId: "recruiting", level: null, wish: null },
  ]);

  await seedStrengths(admin, founder);
  await seedStrengths(admin, second, [
    { statement: "Sagt, wenn etwas technisch nicht trägt", self: "almost_always", reflected: "often", who: "former_colleagues" },
    { statement: "Rechnet nach, bevor er zustimmt", self: "often", reflected: "almost_always", who: "managers" },
  ]);
  await seedStrengths(admin, third, [
    { statement: "Geht auf Fremde zu", self: "almost_always", reflected: "almost_always", who: "current_colleagues" },
    { statement: "Hört zu, bevor sie etwas anbietet", self: "sometimes", reflected: "often", who: "friends" },
  ]);

  await seedDirection(admin, founder);
  await seedDirection(admin, second, [
    { facet: "recurring_theme", statement: "Systeme bauen, die ohne mich weiterlaufen", confidence: "recurring" },
    { facet: "frustrating_condition", statement: "Entscheidungen, die niemand später nachvollziehen kann", confidence: "stated" },
  ]);
  await seedDirection(admin, third, [
    { facet: "recurring_theme", statement: "Menschen zusammenbringen, die voneinander nichts wussten", confidence: "recurring" },
    { facet: "energising_activity", statement: "Das erste Gespräch mit jemandem, der das Problem hat", confidence: "one_example" },
  ]);

  // Verschobene Antwortmuster: Sonst liegen im Nebeneinander alle Punkte
  // uebereinander, und man sieht nicht, ob die Grafik stimmt.
  const assessment = await seedBaseAssessment(admin, founder, 0);
  await seedBaseAssessment(admin, second, 1);
  await seedBaseAssessment(admin, third, 2);

  await seedAlignmentSnapshot(admin, founder, 0);
  await seedAlignmentSnapshot(admin, second, 1);
  await seedAlignmentSnapshot(admin, third, 2);

  // FIND braucht veroeffentlichte Profile - sonst ist der Bereich leer und
  // nicht anzusehen. Und einen Vergleich, der etwas zeigt: Ohne unterschiedlich
  // verteilte Antworten sieht man nicht, ob die Matchpunkte stimmen.
  await seedFindWorld(admin, { founder, second, third });

  const { orgId } = await seedAdvisorWorld(admin, { founder, second, third, advisor });

  console.log(
    [
      "",
      "  Testwelt steht - nur in der lokalen Datenbank.",
      "",
      "    Foundernde:  dev@cofoundery.local (Nora)",
      "                 ben@cofoundery.local (Ben)",
      "                 carla@cofoundery.local (Carla)",
      "    Advisorin:   advisor@cofoundery.local (Pia, Beispiel-Accelerator)",
      `    Passwort:    ${TEST_PASSWORD}`,
      "",
      `    ${CAPABILITY_ENTRIES.length} Fähigkeitsbereiche bei Nora, ${assessment.written} Fragebogen-Antworten je Person.`,
      `    Organisation ${orgId}, alle Umfänge freigegeben - bis auf einen.`,
      "",
      "  Als Nora:  http://localhost:3000/dev-login",
      "             /discovery/suche (Suche steht) · /discovery/profile (erst veroeffentlichen)",
      "             /me/profile · /account (eine offene Freigabe, eine offene Teamanfrage)",
      "  Als Pia:   /dev-login?as=advisor",
      "             /advisor/dashboard · /advisor/group (eine laufende Auswertung)",
      "",
    ].join("\n")
  );
}

/**
 * Die Suchwelt: zwei ausgefuellte Arbeitsprofile und eine Suche.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIE ANTWORTEN SO GEWAEHLT SIND
 * ---------------------------------------------------------------------------
 *
 * Damit auf Noras Ergebniskarte jeder der drei Befunde einmal vorkommt und man
 * sieht, ob die Rechnung stimmt:
 *
 *   Entscheidungen abwaegen - Nora will Aehnlichkeit, Ben antwortet fast
 *   gleich: ein starker Matchpunkt.
 *
 *   Ausprobieren & Lernen - Nora will Ergaenzung, Ben liegt zwei Stufen
 *   daneben: genau die gesuchte Ergaenzung, nicht das Gegenteil.
 *
 *   Mit offenen Fragen umgehen - Nora will Aehnlichkeit, Ben liegt zwei
 *   Stufen daneben: hier lohnt sich ein genauerer Blick.
 *
 * Carla bleibt ohne eigene Suche - so laesst sich der dritte Weg ansehen:
 * FIND zeigt Profile auch dann, nur ohne Aussage zur Arbeitsweise.
 */
async function seedFindWorld(
  admin: SupabaseClient,
  people: { founder: string; second: string; third: string }
) {
  // ---------------------------------------------------------------------------
  // HIER WERDEN KEINE DISCOVERY-PROFILE ANGELEGT - UND DAS IST ABSICHT
  // ---------------------------------------------------------------------------
  //
  // Drei veroeffentlichte Profile waeren bequem: FIND haette sofort etwas zu
  // zeigen. Sie brechen aber drei pgTAP-Suiten (discovery_v2, _slice1,
  // _slice2), weil die GLOBAL zaehlen - "search RPC keeps active profiles"
  // erwartet genau eine Zeile und bekommt vier.
  //
  // Die Suiten sind daran schuld und nicht der Seed: Eine Pruefung, die nur
  // gruen ist, solange die Datenbank leer ist, prueft die Leere mit. Bis sie
  // auf ihre eigenen Zeilen eingeschraenkt sind, bleibt dieser Seed aus
  // `founder_discovery_profiles` heraus.
  //
  // Zum Ansehen: ein Profil unter /discovery/profile anlegen und
  // veroeffentlichen - das ist ohnehin der Weg, den ein Mensch geht.

  const antworten = async (userId: string, stufen: Record<string, number>) => {
    // ERST SUCHEN, DANN ANLEGEN. Auf `assessments` gibt es keinen
    // eindeutigen Schluessel ueber Person, Modul und Fassung - ein `upsert`
    // mit `onConflict` darauf schlaegt fehl und gibt lautlos nichts zurueck.
    // Genau das ist beim ersten Versuch passiert: drei Profile, drei
    // Praeferenzen, null Antworten.
    const vorhanden = await admin
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("instrument_id", "founder-profile-v1")
      .limit(1)
      .maybeSingle();

    const data =
      vorhanden.data ??
      (
        await admin
          .from("assessments")
          .insert({
            user_id: userId,
            module: "founder_profile",
            instrument_id: "founder-profile-v1",
            submitted_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle()
      ).data;

    if (!data?.id) throw new Error(`Kein Arbeitsprofil fuer ${userId} angelegt.`);
    await admin.from("alignment_answers").upsert(
      Object.entries(stufen).map(([blockId, stufe]) => ({
        assessment_id: data.id,
        block_id: blockId,
        answer_format: "ordinal_choice",
        value: { optionId: `${blockId}_o${stufe}` },
      })),
      { onConflict: "assessment_id,block_id" }
    );
  };

  await antworten(people.founder, {
    A01: 2, A02: 2, E01: 1, E02: 1, E03: 1, X01: 3, X02: 3, X03: 3, X04: 3,
  });
  await antworten(people.second, {
    A01: 2, A02: 3, E01: 3, E02: 3, E03: 3, X01: 5, X02: 5, X03: 5, X04: 5,
  });

  const { data: set } = await admin
    .from("discovery_preference_sets")
    .upsert(
      { user_id: people.founder, founder_profile_instrument_id: "founder-profile-v1" },
      { onConflict: "user_id,founder_profile_instrument_id" }
    )
    .select("id")
    .maybeSingle();
  if (set?.id) {
    await admin.from("discovery_theme_preferences").upsert(
      [
        { preference_set_id: set.id, theme_id: "decision_weighing", direction: "similar", importance: 3 },
        { preference_set_id: set.id, theme_id: "experimentation", direction: "complementary", importance: 2 },
        { preference_set_id: set.id, theme_id: "open_questions", direction: "similar", importance: 1 },
      ],
      { onConflict: "preference_set_id,theme_id" }
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
