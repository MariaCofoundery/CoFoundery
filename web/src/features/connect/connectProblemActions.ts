"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getOwnConnectProfile } from "@/features/connect/connectData";
import { notifyConnectProblemInterest } from "@/features/connect/connectNotifications";
import { notifySavedSearchMatches } from "@/features/connect/savedSearchNotifications";
import { getConnectProblem } from "@/features/connect/connectProblemData";
import {
  CONNECT_GEOGRAPHIC_SCOPES,
  PROBLEM_DESCRIPTION_MAX,
  PROBLEM_DESCRIPTION_MIN,
  PROBLEM_APPROACH_AUDIENCE_MAX,
  PROBLEM_APPROACH_AUDIENCE_MIN,
  PROBLEM_APPROACH_NEEDS_MAX,
  PROBLEM_APPROACH_NEEDS_MIN,
  PROBLEM_APPROACH_SUMMARY_MAX,
  PROBLEM_APPROACH_SUMMARY_MIN,
  PROBLEM_INTEREST_NOTE_MAX,
  PROBLEM_INTEREST_NOTE_MIN,
  PROBLEM_TITLE_MAX,
  PROBLEM_TITLE_MIN,
  isConnectProblemIntent,
  isConnectProblemPerspective,
  isOneOf,
} from "@/features/connect/connectTypes";

/**
 * Die Aktionen des Problembretts.
 *
 * Die Datenbank bleibt die Instanz: Laengen, Zustaende und wer was darf,
 * stehen in Constraints und Policies. Hier wird nur so viel geprueft, dass
 * die Person eine verstaendliche Meldung bekommt statt einer technischen -
 * und damit die Fehlermeldung vor der Arbeit kommt, nicht danach.
 */

function parseList(value: FormDataEntryValue | null, max: number) {
  return [
    ...new Set(
      String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ].slice(0, max);
}

function back(path: string, error: string): never {
  revalidatePath(path);
  redirect(`${path}?error=${error}`);
}

export async function saveConnectProblemAction(formData: FormData) {
  const { client, user } = await requireConnectMember("/connect/problems/new");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const intentValue = String(formData.get("author_intent") ?? "");
  const scope = String(formData.get("geographic_scope") ?? "regional");
  const publish = formData.get("intent") === "publish";

  if (title.length < PROBLEM_TITLE_MIN || title.length > PROBLEM_TITLE_MAX) {
    back("/connect/problems/new", "problem_title");
  }
  if (
    description.length < PROBLEM_DESCRIPTION_MIN ||
    description.length > PROBLEM_DESCRIPTION_MAX
  ) {
    back("/connect/problems/new", "problem_description");
  }
  if (!isConnectProblemIntent(intentValue)) {
    back("/connect/problems/new", "problem_intent");
  }

  const { data, error } = await client
    .from("network_problems")
    .insert({
      author_user_id: user.id,
      title,
      description,
      author_intent: intentValue,
      geographic_scope: isOneOf(CONNECT_GEOGRAPHIC_SCOPES, scope) ? scope : "regional",
      locations: parseList(formData.get("locations"), 3),
      topics: parseList(formData.get("topics"), 8),
      industries: parseList(formData.get("industries"), 5),
      status: publish ? "active" : "draft",
      published_at: publish ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    // Wer veroeffentlichen will, braucht ein aktives Connect-Profil - dieselbe
    // Regel wie bei Anzeigen. Der Fall bekommt eine eigene Meldung, sonst
    // liest er sich wie ein technischer Fehler.
    back(
      "/connect/problems/new",
      error.message.includes("active_network_profile_required") ? "identity_incomplete" : "save"
    );
  }

  if (publish) {
    await notifySavedSearchMatches(client, {
      kind: "problem",
      id: data.id,
      ownerUserId: user.id,
      title,
      summary: description,
      topics: parseList(formData.get("topics"), 8),
      industries: parseList(formData.get("industries"), 5),
      locations: parseList(formData.get("locations"), 3),
      geographicScope: isOneOf(CONNECT_GEOGRAPHIC_SCOPES, scope) ? scope : "regional",
      remoteMode: null,
      direction: null,
      category: null,
    });
  }

  revalidatePath("/connect/problems");
  redirect(`/connect/problems/${data.id}`);
}

/**
 * "Ich wuerde daran arbeiten."
 *
 * Mit Begruendung, weil ein Klick ohne Worte ein Like waere - und Likes sind
 * hier ausdruecklich nicht vorgesehen.
 */
export async function expressConnectProblemInterestAction(formData: FormData) {
  const { client, user } = await requireConnectMember();
  const problemId = String(formData.get("problem_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  // Ohne Bezug gilt die Meldung dem Problem, mit Bezug einem Ansatz. Das
  // entscheidet, wer sie ueberhaupt zu sehen bekommt.
  const approachId = String(formData.get("approach_id") ?? "").trim() || null;
  const path = `/connect/problems/${problemId}`;

  if (!problemId) back("/connect/problems", "save");
  if (note.length < PROBLEM_INTEREST_NOTE_MIN || note.length > PROBLEM_INTEREST_NOTE_MAX) {
    back(path, "interest_note");
  }

  const { error } = await client
    .from("network_problem_interests")
    .insert({ problem_id: problemId, approach_id: approachId, user_id: user.id, note });

  if (error) {
    // Ein doppelter Eintrag ist kein Fehler der Person - sie hat schon
    // Interesse bekundet und sieht das auf der Seite.
    if (error.code === "23505") {
      revalidatePath(path);
      redirect(path);
    }
    back(path, "save");
  }

  // Die einstellende Person erfaehrt davon - sonst haengt das Interesse in
  // einer Seite, die sie vielleicht wochenlang nicht oeffnet.
  let lookup = client
    .from("network_problem_interests")
    .select("id")
    .eq("problem_id", problemId)
    .eq("user_id", user.id);
  lookup = approachId ? lookup.eq("approach_id", approachId) : lookup.is("approach_id", null);
  const { data: interest } = await lookup.maybeSingle();

  const problem = await getConnectProblem(client, problemId);

  // Wem die Meldung gilt, der erfaehrt davon - und niemand sonst. Bei einem
  // Ansatz ist das nicht die einstellende Person. Dieselbe Ableitung steht in
  // der Datenbank; hier geht es nur darum, wohin die Mail geht.
  let recipientUserId = problem?.author_user_id ?? null;
  if (approachId) {
    const { data: approach } = await client
      .from("network_problem_approaches")
      .select("author_user_id")
      .eq("id", approachId)
      .maybeSingle();
    recipientUserId = (approach as { author_user_id: string } | null)?.author_user_id ?? null;
  }

  if (interest && problem && recipientUserId) {
    const sender = await getOwnConnectProfile(client, user.id);
    await notifyConnectProblemInterest(
      client,
      interest.id,
      problemId,
      recipientUserId,
      sender?.display_name ?? null,
      approachId ? "approach_interest" : "problem_interest"
    );
  }

  revalidatePath(path);
  redirect(`${path}?saved=${approachId ? "approach_interest" : "interest"}`);
}

export async function withdrawConnectProblemInterestAction(formData: FormData) {
  const { client, user } = await requireConnectMember();
  const problemId = String(formData.get("problem_id") ?? "").trim();
  const approachId = String(formData.get("approach_id") ?? "").trim() || null;
  const path = `/connect/problems/${problemId}`;

  // Mit dem Interesse faellt ein daraus entstandenes Gespraech weg - das
  // sagt die Rueckfrage in der Oberflaeche, nicht erst der Effekt.
  let removal = client
    .from("network_problem_interests")
    .delete()
    .eq("problem_id", problemId)
    .eq("user_id", user.id);
  // Ohne diese Unterscheidung loeschte das Zuruecknehmen einer Meldung zum
  // Problem auch jede Rueckmeldung zu einem Ansatz mit.
  removal = approachId ? removal.eq("approach_id", approachId) : removal.is("approach_id", null);

  const { error } = await removal;

  if (error) back(path, "save");

  revalidatePath(path);
  redirect(path);
}

/**
 * Die einstellende Person nimmt ein Interesse an. Daraus entsteht unmittelbar
 * ein Gespraech - das Interesse war die Anfrage.
 */
export async function acceptConnectProblemInterestAction(formData: FormData) {
  const { client } = await requireConnectMember();
  const interestId = String(formData.get("interest_id") ?? "").trim();
  const problemId = String(formData.get("problem_id") ?? "").trim();
  const path = `/connect/problems/${problemId}`;

  const { data, error } = await client.rpc("accept_network_problem_interest", {
    p_interest_id: interestId,
  });

  if (error || !data) {
    back(path, error?.message.includes("blocked") ? "contact_unavailable" : "save");
  }

  revalidatePath("/connect/messages");
  redirect(`/connect/messages/${data}`);
}

/** Zurueckziehen oder als geloest markieren - beides nur durch die Person selbst. */
export async function updateConnectProblemStatusAction(formData: FormData) {
  const { client, user } = await requireConnectMember();
  const problemId = String(formData.get("problem_id") ?? "").trim();
  const next = String(formData.get("status") ?? "");
  const path = `/connect/problems/${problemId}`;

  if (next !== "withdrawn" && next !== "resolved" && next !== "active") {
    back(path, "save");
  }

  const { error } = await client
    .from("network_problems")
    .update({
      status: next,
      published_at: next === "active" ? new Date().toISOString() : undefined,
      resolved_at: next === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", problemId)
    .eq("author_user_id", user.id);

  if (error) {
    back(path, error.message.includes("active_network_profile_required") ? "identity_incomplete" : "save");
  }

  if (next === "active") {
    const published = await getConnectProblem(client, problemId);
    if (published) {
      await notifySavedSearchMatches(client, {
        kind: "problem",
        id: published.id,
        ownerUserId: user.id,
        title: published.title,
        summary: published.description,
        topics: published.topics,
        industries: published.industries,
        locations: published.locations,
        geographicScope: published.geographic_scope,
        remoteMode: null,
        direction: null,
        category: null,
      });
    }
  }

  revalidatePath(path);
  revalidatePath("/connect/problems");
  redirect(path);
}

/**
 * Ein bestehendes Problem aendern.
 *
 * Bewusst getrennt vom Anlegen: Hier gilt zusaetzlich, dass nur die
 * einstellende Person aendern darf, und ein veroeffentlichtes Problem bleibt
 * veroeffentlicht - der Zustand gehoert auf die Detailseite, nicht in ein
 * Formular, in dem man ihn versehentlich mitaendert.
 */
export async function updateConnectProblemAction(formData: FormData) {
  const { client, user } = await requireConnectMember();

  const problemId = String(formData.get("problem_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const intentValue = String(formData.get("author_intent") ?? "");
  const scope = String(formData.get("geographic_scope") ?? "regional");
  const publish = formData.get("intent") === "publish";
  const path = `/connect/problems/${problemId}/edit`;

  if (!problemId) back("/connect/problems", "save");
  if (title.length < PROBLEM_TITLE_MIN || title.length > PROBLEM_TITLE_MAX) {
    back(path, "problem_title");
  }
  if (description.length < PROBLEM_DESCRIPTION_MIN || description.length > PROBLEM_DESCRIPTION_MAX) {
    back(path, "problem_description");
  }
  if (!isConnectProblemIntent(intentValue)) {
    back(path, "problem_intent");
  }

  const { data: existing } = await client
    .from("network_problems")
    .select("status")
    .eq("id", problemId)
    .eq("author_user_id", user.id)
    .maybeSingle();
  if (!existing) back("/connect/problems", "save");

  // Ein veroeffentlichtes Problem bleibt veroeffentlicht. Ein Entwurf wird es
  // nur, wenn der Veroeffentlichen-Knopf gedrueckt wurde.
  const nextStatus = existing.status === "active" ? "active" : publish ? "active" : "draft";

  const { error } = await client
    .from("network_problems")
    .update({
      title,
      description,
      author_intent: intentValue,
      geographic_scope: isOneOf(CONNECT_GEOGRAPHIC_SCOPES, scope) ? scope : "regional",
      locations: parseList(formData.get("locations"), 3),
      topics: parseList(formData.get("topics"), 8),
      industries: parseList(formData.get("industries"), 5),
      status: nextStatus,
      published_at:
        nextStatus === "active" && existing.status !== "active"
          ? new Date().toISOString()
          : undefined,
    })
    .eq("id", problemId)
    .eq("author_user_id", user.id);

  if (error) {
    back(
      path,
      error.message.includes("active_network_profile_required") ? "identity_incomplete" : "save"
    );
  }

  revalidatePath(`/connect/problems/${problemId}`);
  revalidatePath("/connect/problems");
  redirect(`/connect/problems/${problemId}`);
}

// ---------------------------------------------------------------------------
// Kenne ich auch
// ---------------------------------------------------------------------------
/**
 * Eine Bestaetigung setzen oder wechseln.
 *
 * Anders als das Interesse ist das kein Ereignis, ueber das jemand
 * benachrichtigt wird - es ist absichtlich folgenlos. Wer bestaetigt, dass es
 * ein Problem gibt, geht damit keine Verpflichtung ein und wird niemandem
 * namentlich gemeldet. Sonst waere es kein billiges Signal mehr.
 */
export async function confirmConnectProblemAction(formData: FormData) {
  const { client, user } = await requireConnectMember();
  const problemId = String(formData.get("problem_id") ?? "").trim();
  const perspective = String(formData.get("perspective") ?? "").trim();
  const path = `/connect/problems/${problemId}`;

  if (!problemId) back("/connect/problems", "save");
  if (!isConnectProblemPerspective(perspective)) back(path, "perspective");

  // Wechseln statt doppeln: Wer sich vertan hat, soll die Perspektive
  // korrigieren koennen, ohne erst zurueckzunehmen.
  const { error } = await client
    .from("network_problem_confirmations")
    .upsert(
      { problem_id: problemId, user_id: user.id, perspective },
      { onConflict: "problem_id,user_id" }
    );

  if (error) back(path, "save");

  revalidatePath(path);
  redirect(path);
}

export async function withdrawConnectProblemConfirmationAction(formData: FormData) {
  const { client, user } = await requireConnectMember();
  const problemId = String(formData.get("problem_id") ?? "").trim();
  const path = `/connect/problems/${problemId}`;

  const { error } = await client
    .from("network_problem_confirmations")
    .delete()
    .eq("problem_id", problemId)
    .eq("user_id", user.id);

  if (error) back(path, "save");

  revalidatePath(path);
  redirect(path);
}

// ---------------------------------------------------------------------------
// Der Ansatz
// ---------------------------------------------------------------------------
/**
 * Einen Ansatz schreiben oder aendern.
 *
 * Ein Ansatz je Person und Problem: Wer umdenkt, aendert seinen, statt einen
 * zweiten daneben zu stellen. Deshalb ein upsert und kein insert.
 */
export async function saveConnectProblemApproachAction(formData: FormData) {
  const { client, user } = await requireConnectMember();
  const problemId = String(formData.get("problem_id") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const audience = String(formData.get("audience") ?? "").trim();
  const needs = String(formData.get("needs") ?? "").trim();
  const path = `/connect/problems/${problemId}`;

  if (!problemId) back("/connect/problems", "save");
  if (summary.length < PROBLEM_APPROACH_SUMMARY_MIN || summary.length > PROBLEM_APPROACH_SUMMARY_MAX) {
    back(path, "approach_summary");
  }
  if (audience.length < PROBLEM_APPROACH_AUDIENCE_MIN || audience.length > PROBLEM_APPROACH_AUDIENCE_MAX) {
    back(path, "approach_audience");
  }
  if (needs.length < PROBLEM_APPROACH_NEEDS_MIN || needs.length > PROBLEM_APPROACH_NEEDS_MAX) {
    back(path, "approach_needs");
  }

  const { error } = await client
    .from("network_problem_approaches")
    .upsert(
      {
        problem_id: problemId,
        author_user_id: user.id,
        summary,
        audience,
        needs,
        // Ein erneutes Schreiben holt einen zurueckgezogenen Ansatz zurueck -
        // das ist es, was jemand meint, der ihn wieder ausfuellt.
        status: "active",
      },
      { onConflict: "problem_id,author_user_id" }
    );

  if (error) back(path, "save");

  revalidatePath(path);
  redirect(`${path}?saved=approach`);
}

export async function withdrawConnectProblemApproachAction(formData: FormData) {
  const { client, user } = await requireConnectMember();
  const problemId = String(formData.get("problem_id") ?? "").trim();
  const path = `/connect/problems/${problemId}`;

  // Zurueckziehen, nicht loeschen: Wer es sich anders ueberlegt, findet seinen
  // Text wieder, statt ihn neu schreiben zu muessen.
  const { error } = await client
    .from("network_problem_approaches")
    .update({ status: "withdrawn" })
    .eq("problem_id", problemId)
    .eq("author_user_id", user.id);

  if (error) back(path, "save");

  revalidatePath(path);
  redirect(path);
}
