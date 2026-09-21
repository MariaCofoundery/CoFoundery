import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isProductChromePath } from "@/features/navigation/productChromePath";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sonst findet die Pruefung Begriffe in ihrer Begruendung. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
/**
 * Dasselbe fuer SQL. `codeOnly` kennt nur // und die Blockform - in einer
 * Migration steht die Begruendung hinter `--`, und die Pruefung fand dort
 * genau die Begriffe, deren Abwesenheit sie belegen sollte.
 */
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261008120000_discovery_intro_conversations.sql";
const INBOX = "src/app/(product)/messages/page.tsx";
const CONVERSATION = "src/app/(product)/messages/[conversationId]/page.tsx";
const LEGACY = "src/app/(product)/connect/messages/[conversationId]/page.tsx";
const ACCESS = "src/features/connect/conversationAccess.ts";

// ---------------------------------------------------------------------------
// Ein Postfach, drei Ursprünge
// ---------------------------------------------------------------------------
test("das Postfach ist für jede angemeldete Person erreichbar", () => {
  // DER KERN DES UMBAUS: Der Nachrichtenbereich lag unter /connect und
  // verlangte eine Connect-Mitgliedschaft. Ein Gespräch aus Find wäre für
  // jemanden ohne Connect unerreichbar gewesen - und er hätte eine
  // Weiterleitung mit einer Begründung bekommen, die mit der Sache nichts zu
  // tun hat.
  assert.equal(isProductChromePath("/messages"), true);
  assert.equal(isProductChromePath("/messages/abc"), true);

  const access = codeOnly(ACCESS);
  assert.doesNotMatch(access, /is_network_member|requireConnectMember/);
  assert.match(access, /getRequestUser/);

  for (const page of [INBOX, CONVERSATION]) {
    assert.match(codeOnly(page), /requireSignedInForMessages/, `${page} gatet noch auf Connect`);
    assert.doesNotMatch(codeOnly(page), /requireConnectMember/, `${page} gatet noch auf Connect`);
  }
});

test("die Mitgliedschaftssperre ist aus allen Gesprächsfunktionen heraus", () => {
  // Sie stand in fünf Funktionen. Eine übersehene hätte gereicht, damit ein
  // Find-Nutzer an einer beliebigen Stelle wieder hängenbleibt.
  const migration = source(MIGRATION);
  for (const fn of [
    "list_network_conversations",
    "mark_network_conversation_read",
    "get_unread_network_message_count",
  ]) {
    assert.ok(migration.includes(`function public.${fn}`), `${fn} wird nicht neu definiert`);
  }
  // In den neu definierten Fassungen steht nur noch die Anmeldepflicht.
  const redefined = migration.slice(migration.indexOf("drop function if exists public.list_network_conversations"));
  assert.doesNotMatch(redefined, /is_network_member/);
  assert.equal((redefined.match(/authentication_required/g) ?? []).length, 3);
});

test("genau ein Ursprung je Gespräch – jetzt aus drei", () => {
  const migration = source(MIGRATION);
  assert.match(migration, /discovery_intro_request_id uuid unique/);
  // Die Summe der drei muss 1 sein. Ein "oder" mit drei Zweigen waere leicht
  // falsch zu schreiben; die Summe ist nicht missverstaendlich.
  assert.match(migration, /\(contact_request_id is not null\)::int/);
  assert.match(migration, /\(problem_interest_id is not null\)::int/);
  assert.match(migration, /\(discovery_intro_request_id is not null\)::int/);
  assert.match(migration, /= 1\s*\)/);
});

test("die Zugriffsregel bleibt an EINER Stelle", () => {
  // Der Kommentar bei ihrer Extraktion lautete: "Sie stand fünfmal wortgleich,
  // und beim sechsten Mal hätte jemand eine vergessen." Genau deshalb darf der
  // dritte Ursprung nur dort nachgetragen sein.
  const migration = source(MIGRATION);
  assert.match(migration, /function public\.can_use_network_conversation/);
  assert.match(
    migration,
    /conversation\.discovery_intro_request_id is not null and intro\.status = 'accepted'/
  );
});

test("der Nachrichtenvertrag kennt den neuen Ursprung", () => {
  // Beim ZWEITEN Ursprung war das die Falle: Der Trigger prüfte gegen die
  // Kontaktanfrage, und im neuen Gespräch liess sich keine einzige Nachricht
  // schreiben. Dieser Test existiert, damit es beim dritten nicht wieder
  // passiert.
  const migration = source(MIGRATION);
  const messageContract = migration.slice(
    migration.indexOf("function public.enforce_network_message_contract")
  );
  assert.match(messageContract, /discovery_intro_request_id is not null/);
  assert.match(messageContract, /network_message_intro_not_accepted/);
});

test("die Teilnehmenden ergeben sich aus dem Intro, nicht aus der Eingabe", () => {
  const migration = source(MIGRATION);
  const contract = migration.slice(
    migration.indexOf("function public.enforce_network_conversation_contract"),
    migration.indexOf("function public.enforce_network_message_contract")
  );
  assert.match(contract, /v_intro\.status <> 'accepted'/);
  assert.match(contract, /new\.participant_a_user_id <> v_intro\.requester_user_id/);
  assert.match(contract, /new\.participant_b_user_id <> v_intro\.recipient_user_id/);
});

// ---------------------------------------------------------------------------
// Der Name des Gegenübers
// ---------------------------------------------------------------------------
test("der Name folgt dem Ursprung", () => {
  // Vorher kam er nur aus dem Connect-Profil. Für ein Gespräch aus Find wäre
  // das immer leer - und die Oberfläche hätte "Ehemaliges Mitglied" für einen
  // lebenden Menschen angezeigt. Umgekehrt wäre ein pauschaler Rückfall auf
  // person_core eine stille Ausweitung: In einem Connect-Gespräch stünde der
  // Klarname einer Person, die ihr Connect-Profil gerade zurückgezogen hat.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /founder_discovery_profiles discovery_profile/);
  assert.match(migration, /when conversation\.discovery_intro_request_id is not null then/);
  assert.doesNotMatch(migration, /person_core/);
});

// ---------------------------------------------------------------------------
// Die Oberfläche
// ---------------------------------------------------------------------------
test("jedes Gespräch sagt, woraus es entstanden ist", () => {
  // Der Preis eines gemeinsamen Postfachs: Ohne diese Angabe rät man beim
  // Lesen, aus welchem Zusammenhang eine Nachricht kommt.
  assert.match(codeOnly(INBOX), /messages\.origins\./);
  assert.match(codeOnly(CONVERSATION), /messages\.origins\./);
  // Und nicht aus einem fehlenden listing_id geschlossen - das ist auch bei
  // einer ausgetretenen Person leer.
  assert.match(codeOnly(CONVERSATION), /conversation\.origin === "connect_contact" && conversation\.listing_id/);

  for (const locale of ["de", "en"]) {
    const messages = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        messages: { origins: Record<string, string> };
      }
    ).messages;
    for (const origin of ["connect_contact", "connect_problem", "discovery_intro"]) {
      assert.ok(messages.origins?.[origin], `${locale}: origins.${origin} fehlt`);
    }
    assert.equal(
      new Set(Object.values(messages.origins)).size,
      3,
      `${locale}: zwei Ursprünge sagen dasselbe`
    );
  }
});

test("die alte Adresse bleibt erreichbar", () => {
  // Sie steht in verschickten Benachrichtigungen und in Lesezeichen. Sie
  // fallen zu lassen hätte aus jeder alten Mail einen Fehler gemacht.
  const legacy = codeOnly(LEGACY);
  assert.match(legacy, /redirect\(`\/messages\/\$\{encodeURIComponent\(conversationId\)\}`\)/);
  assert.equal(isProductChromePath("/connect/messages/abc"), true);
});

test("aus einem angenommenen Intro führt ein Weg ins Gespräch", () => {
  // In Find gab es genau zwei Nachrichten - Anfrage und Antwort -, dann direkt
  // das gemeinsame Matching. Dazwischen fehlte das Gespräch.
  const page = codeOnly("src/app/(product)/discovery/intros/page.tsx");
  assert.match(page, /openConversation/);
  // Auf BEIDEN Karten: erhaltene und gestellte Anfragen.
  assert.equal((page.match(/intros\.openConversation/g) ?? []).length, 2);

  const action = codeOnly("src/features/discovery/discoveryConversationActions.ts");
  assert.match(action, /ensure_discovery_intro_conversation/);
  assert.match(action, /redirect\(`\/messages\/\$\{data\}`\)/);
  // Die Prüfung liegt in der Funktion, nicht hier - eine zweite Kopie derselben
  // Regel liefe auseinander.
  assert.doesNotMatch(action, /status === "accepted"|requester_user_id/);
});

test("das Postfach steht in der Leiste, mit einer Zahl für alles, was dort wartet", () => {
  // Der Zähler war schon da, er hing nur am Connect-Eintrag - also an einem
  // Bereich, den ein Find-Nutzer nicht hat.
  //
  // GEÄNDERT AM 21.09.2026: Vorher stand hier `count={unreadConnectMessageCount}`.
  // Seit die Hinweise ("die andere Seite hat ausgefüllt, du bist dran") im
  // Postfach stehen, zählt die Zahl beides zusammen - zwei Punkte am selben
  // Ort wären zwei Fragen an denselben Ort. Deshalb ein eigener Text: "3
  // ungelesene Nachrichten" wäre falsch, wenn zwei davon Übergaben sind.
  const shell = codeOnly("src/features/navigation/ProductShell.tsx");
  assert.match(shell, /href="\/messages"/);
  assert.match(shell, /count=\{messagesAttentionCount\}/);
  // Und die Zahl entsteht aus beiden Teilen, nicht aus einem.
  assert.match(
    shell,
    /getMessagesAttentionCount\(unreadConnectMessageCount, waitingNoticeCount\)/
  );

  for (const locale of ["de", "en"]) {
    const nav = JSON.parse(readFileSync(`messages/${locale}/navigation.json`, "utf8")) as Record<
      string,
      string
    >;
    assert.ok(nav.messages, `${locale}: der Eintrag hat kein Label`);
    assert.match(nav.messagesAttentionBadge, /plural/, `${locale}: der Zähler beugt nicht`);
  }
});

test("die Gesprächsliste ist aus der Kontaktseite heraus verlinkt, nicht dupliziert", () => {
  // Die Liste stand mitten auf der Connect-Kontaktseite, zwischen den offenen
  // Anfragen. Sie dort zusätzlich zu lassen wären zwei Orte für dieselbe Sache.
  const contacts = codeOnly("src/app/(product)/connect/contacts/page.tsx");
  assert.doesNotMatch(contacts, /href=\{`\/connect\/messages\//);
});
