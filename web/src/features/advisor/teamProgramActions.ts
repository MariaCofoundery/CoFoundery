"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendTeamProgramInviteEmail } from "@/lib/email/sendTeamProgramInviteEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { parseAccent } from "@/features/advisor/programAccent";
import { decodePhotoData } from "@/features/connect/connectPhotoData";
import { PROGRAM_LOGO_BUCKET, programStorageClient } from "@/features/advisor/programPageStorage";
import { createClient } from "@/lib/supabase/server";
import { berlinLocalToIso, berlinToIso } from "@/lib/berlinTime";

/**
 * Team <-> Programm. Die Regeln stehen in der Datenbank (Migration
 * 20270117120000): wer einladen darf, wer zustimmen muss, wann ein Programm
 * aktiv ist. Hier steht nur, was aufgerufen wird.
 */

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function requireUser(next: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(next)}`);
  return client;
}

const orgSettings = (orgId: string, extra = "") =>
  `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=program${extra}`;
const orgEnrollTab = (orgId: string, extra = "") =>
  `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=enroll${extra}`;
const orgPlanTab = (orgId: string, extra = "") =>
  `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=plan${extra}`;
const orgMaterialsTab = (orgId: string, extra = "") =>
  `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=materials${extra}`;
const orgLearningTab = (orgId: string, extra = "") =>
  `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=learning${extra}`;
const orgExpertsTab = (orgId: string, extra = "") =>
  `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=experts${extra}`;
// Erfolge stehen seit 05.11.2026 unter "Funktionen & Erfolge".
const orgSuccessTab = (orgId: string, extra = "") =>
  `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=features${extra}#erfolge`;
const orgPageTab = (orgId: string, extra = "") =>
  `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=page${extra}`;

/**
 * Der Link steht NUR in der Antwort dieses Aufrufs - gespeichert wird nur der
 * Hash. Optional geht er zusaetzlich per Mail an eine Gruenderin oder einen
 * Gruender; die Adresse wird nur dafuer benutzt und nicht gespeichert.
 */
export async function createTeamProgramInviteAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgEnrollTab(orgId));
  const token = randomBytes(24).toString("hex");
  const { error } = await client.rpc("create_team_program_invite", {
    p_org_id: orgId,
    p_token_hash: hashOf(token),
    p_label: String(formData.get("label") ?? "").trim().slice(0, 120) || null,
  });
  revalidatePath("/advisor/organisation");
  if (error) redirect(orgEnrollTab(orgId, error.code === "53400" ? "&programInviteError=limit" : "&orgError=org_forbidden"));

  let mailed = "";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      mailed = "&programInviteMail=invalid";
    } else {
      const { data: org } = await client.from("advisor_orgs").select("name").eq("id", orgId).maybeSingle();
      const result = await sendTeamProgramInviteEmail({
        recipientEmail: email,
        orgName: String((org as { name?: string } | null)?.name ?? ""),
        url: `${getPublicAppOrigin()}/programm/einladung/${token}`,
      });
      mailed = result.ok ? "&programInviteMail=sent" : "&programInviteMail=failed";
    }
  }
  redirect(orgEnrollTab(orgId, `&programInvite=${token}${mailed}`));
}

export async function revokeTeamProgramInviteAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgEnrollTab(orgId));
  await client.rpc("revoke_team_program_invite", { p_invite_id: String(formData.get("inviteId") ?? "") });
  revalidatePath("/advisor/organisation");
  redirect(orgEnrollTab(orgId));
}

export async function setTeamProgramContactsAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgSettings(orgId));
  const { error } = await client.rpc("set_team_program_contacts", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_advisor_user_ids: formData.getAll("contact").map(String),
  });
  revalidatePath("/advisor/organisation");
  redirect(orgSettings(orgId, error ? "&orgError=org_failed" : ""));
}

/** Das Team tritt bei: Wer einloest, stimmt fuer sich zu; die anderen folgen unter /programm. */
export async function startTeamProgramAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const client = await requireUser(`/programm/einladung/${token}`);
  const { error } = await client.rpc("start_team_program", {
    p_token_hash: hashOf(token),
    p_team_id: String(formData.get("teamId") ?? ""),
  });
  if (error) redirect(`/programm/einladung/${encodeURIComponent(token)}?fehler=1`);
  revalidatePath("/programm");
  redirect("/programm?neu=1");
}

export async function consentTeamProgramAction(formData: FormData) {
  const client = await requireUser("/programm");
  await client.rpc("consent_team_program", { p_program_id: String(formData.get("programId") ?? "") });
  revalidatePath("/programm");
  redirect("/programm");
}

export async function endTeamProgramAction(formData: FormData) {
  const client = await requireUser("/programm");
  await client.rpc("end_team_program", { p_program_id: String(formData.get("programId") ?? "") });
  revalidatePath("/programm");
  redirect("/programm");
}

/** Zurueck nur auf die eigenen Programmseiten - kein freies Ziel aus dem Formular. */
const safeReturn = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "");
  return text === "/programm" || /^\/advisor\/programm\/[0-9a-f-]{36}(\?tab=(meilensteine|updates|freigaben))?$/.test(text) ? text : "/programm";
};
const toInt = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return /^\d{1,4}$/.test(text) ? Number(text) : null;
};

export async function saveProgramMilestoneAction(formData: FormData) {
  const back = safeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  const due = String(formData.get("dueOn") ?? "").trim();
  const target = toInt(formData.get("target"));
  await client.rpc("save_team_program_milestone", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_milestone_id: String(formData.get("milestoneId") ?? "") || null,
    p_title: String(formData.get("title") ?? "").slice(0, 160),
    p_due_on: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    p_target_count: target && target > 0 ? target : null,
    p_done_count: toInt(formData.get("done")) ?? 0,
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}

export async function deleteProgramMilestoneAction(formData: FormData) {
  const back = safeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  await client.rpc("delete_team_program_milestone", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_milestone_id: String(formData.get("milestoneId") ?? ""),
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}

export async function submitProgramUpdateAction(formData: FormData) {
  const client = await requireUser("/programm");
  const answers = formData
    .getAll("question")
    .map((question, index) => ({
      q: String(question).slice(0, 200),
      a: String(formData.getAll("answer")[index] ?? "").slice(0, 2000),
    }))
    .filter((entry) => entry.q.trim() !== "");
  if (answers.length > 0) {
    await client.rpc("submit_program_update", {
      p_program_id: String(formData.get("programId") ?? ""),
      p_answers: answers,
    });
  }
  revalidatePath("/programm");
  redirect("/programm");
}

export async function setProgramUpdateQuestionsAction(formData: FormData) {
  const back = safeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  await client.rpc("set_program_update_questions", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_questions: String(formData.get("questions") ?? "")
      .split("\n")
      .map((line) => line.trim().slice(0, 200))
      .filter((line) => line.length > 0)
      .slice(0, 5),
  });
  revalidatePath("/advisor/programm");
  redirect(back);
}

export async function saveProgramProfileAction(formData: FormData) {
  const client = await requireUser("/programm");
  const text = (name: string, max: number) => String(formData.get(name) ?? "").slice(0, max);
  await client.rpc("save_team_program_profile", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_company_name: text("companyName", 120),
    p_founders: text("founders", 300),
    p_address: text("address", 300),
    p_contact_email: text("contactEmail", 200),
    p_contact_phone: text("contactPhone", 50),
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect("/programm");
}

/** Die Organisation pflegt ihre Stammdaten zum Team; die Datenbank prueft, wer das darf. */
export async function saveProgramOrgDataAction(formData: FormData) {
  const programId = String(formData.get("programId") ?? "");
  const back = `/advisor/programm/${encodeURIComponent(programId)}`;
  const client = await requireUser(back);
  const text = (name: string, max: number) => String(formData.get(name) ?? "").slice(0, max);
  const admitted = text("admittedOn", 10);
  await client.rpc("save_team_program_org_data", {
    p_program_id: programId,
    p_company_name: text("companyName", 120),
    p_legal_form: text("legalForm", 60),
    p_address: text("address", 300),
    p_contact_name: text("contactName", 120),
    p_contact_email: text("contactEmail", 200),
    p_contact_phone: text("contactPhone", 50),
    p_website: text("website", 200),
    p_admitted_on: /^\d{4}-\d{2}-\d{2}$/.test(admitted) ? admitted : null,
    p_reference: text("reference", 60),
    p_note: text("note", 1000),
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}

/** Batch, Kategorie und Alumni setzen Bezugspersonen und Inhaber; die Datenbank prueft das. */
export async function setProgramMetaAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgSettings(orgId));
  await client.rpc("set_team_program_meta", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_batch: String(formData.get("batch") ?? "").slice(0, 60),
    p_category: String(formData.get("category") ?? "").slice(0, 60),
    p_is_alumni: formData.get("alumni") === "yes",
  });
  revalidatePath("/advisor/organisation");
  redirect(orgSettings(orgId));
}

/**
 * Die Organisation entfernt ein Team aus dem Programm. Nur der Inhaber; das Team bekommt einen Hinweis,
 * seine Programmdaten werden geloescht (wie beim Beenden durch das Team). Die Datenbank prueft die Rolle.
 */
export async function removeTeamFromProgramAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgSettings(orgId));
  const { error } = await client.rpc("remove_team_from_program", { p_program_id: String(formData.get("programId") ?? "") });
  revalidatePath("/advisor/organisation");
  redirect(orgSettings(orgId, error ? "&orgError=org_failed" : "&teamRemoved=1"));
}

/**
 * "Team ist vollstaendig": markiert ein Team mit genau einer Person als Ein-Personen-Team.
 * Das Team selbst oder die Organisation (Inhaber, Bezugsperson) setzt es; zuruecknehmen kann nur das Team.
 * Eine Zustimmung ersetzt es nicht - die Datenbank prueft das.
 */
export async function setTeamProgramSoloAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgId ? orgSettings(orgId) : "/programm");
  await client.rpc("set_team_program_solo", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_confirmed: formData.get("confirmed") === "yes",
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgId ? orgSettings(orgId) : "/programm");
}

/** Die Anfrage ist keine Freigabe: Das Team entscheidet selbst, die Datenbank legt dieselbe Review-Anfrage an wie bisher. */
export async function requestProgramTeamReviewAction(formData: FormData) {
  const programId = String(formData.get("programId") ?? "");
  const back = `/advisor/programm/${programId}?tab=freigaben`;
  const client = await requireUser(back);
  await client.rpc("request_program_team_review", {
    p_program_id: programId,
    p_note: String(formData.get("note") ?? "").slice(0, 400),
  });
  revalidatePath("/advisor/programm");
  redirect(/^\/advisor\/programm\/[0-9a-f-]{36}\?tab=freigaben$/.test(back) ? back : "/advisor/organisation");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const normalizeCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

/** Der Code wird hier erzeugt (ohne verwechselbare Zeichen) und im Klartext gespeichert, damit der Inhaber ihn wieder sehen kann. */
export async function createTeamProgramCodeAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgEnrollTab(orgId));
  const bytes = randomBytes(8);
  const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  const number = (name: string, fallback: number) => {
    const text = String(formData.get(name) ?? "").trim();
    return /^\d{1,3}$/.test(text) ? Number(text) : fallback;
  };
  const { error } = await client.rpc("create_team_program_code", {
    p_org_id: orgId,
    p_code: code,
    p_label: String(formData.get("label") ?? "").trim().slice(0, 120) || null,
    p_max_uses: number("maxUses", 10),
    p_valid_days: number("validDays", 90),
  });
  revalidatePath("/advisor/organisation");
  redirect(orgEnrollTab(orgId, error ? (error.code === "53400" ? "&programCodeError=limit" : "&orgError=org_forbidden") : ""));
}

export async function revokeTeamProgramCodeAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgEnrollTab(orgId));
  await client.rpc("revoke_team_program_code", { p_code_id: String(formData.get("codeId") ?? "") });
  revalidatePath("/advisor/organisation");
  redirect(orgEnrollTab(orgId));
}

/** Vom Feld auf /programm: bringt den eingegebenen Code zur Auswahlseite. */
export async function openTeamProgramCodeAction(formData: FormData) {
  await requireUser("/programm");
  const code = normalizeCode(String(formData.get("code") ?? ""));
  redirect(code.length === 8 ? `/programm/code/${code}` : "/programm?code=invalid");
}

export async function startTeamProgramByCodeAction(formData: FormData) {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const client = await requireUser(`/programm/code/${code}`);
  const { data, error } = await client.rpc("start_team_program_by_code", {
    p_code: code,
    p_team_id: String(formData.get("teamId") ?? ""),
  });
  if (error || !data) redirect(`/programm/code/${code}?fehler=1`);
  revalidatePath("/programm");
  redirect("/programm?neu=1");
}

/**
 * Fuer Personen ohne Team: legt ein Team mit ihnen an und tritt dem Programm bei.
 * Ohne Founder-Rolle gibt es kein Team (dieselbe Regel wie beim ersten Vorhaben).
 */
export async function createTeamForProgramCodeAction(formData: FormData) {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const client = await requireUser(`/programm/code/${code}`);
  const { data, error } = await client.rpc("create_team_for_program_code", {
    p_code: code,
    p_name: String(formData.get("teamName") ?? "").trim().slice(0, 60) || null,
  });
  if (error?.message?.includes("not_a_founder")) redirect(`/programm/code/${code}?fehler=rolle`);
  if (error || !data) redirect(`/programm/code/${code}?fehler=1`);
  revalidatePath("/programm");
  redirect("/programm?neu=1");
}

/**
 * Programmseite speichern: Kurzname, Willkommenstext, Haken "veroeffentlichen" und
 * optional ein neues Logo (als Bild-Daten aus dem Formular). Wer die
 * Organisation fuehrt, prueft die Datenbank; das Logo wird erst nach dieser
 * Pruefung hochgeladen.
 */
export async function saveProgramPageAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgPageTab(orgId));
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const { error } = await client.rpc("set_org_program_page", {
    p_org_id: orgId,
    p_slug: slug,
    p_published: formData.get("published") === "yes",
    p_welcome: String(formData.get("welcome") ?? "").slice(0, 600),
    p_accent: parseAccent(String(formData.get("accent") ?? "")),
    p_accent_b: parseAccent(String(formData.get("accentB") ?? "")),
  });
  if (error) {
    const code = error.code === "23505" ? "slug_taken" : error.code === "22023" || error.code === "23514" ? "slug_invalid" : "failed";
    redirect(orgPageTab(orgId, `&pageError=${code}`));
  }

  const removeLogo = formData.get("removeLogo") === "yes";
  const logoData = String(formData.get("logo_image_data") ?? "");
  const storage = programStorageClient();
  if (storage && (removeLogo || logoData)) {
    let newPath: string | null = null;
    if (logoData) {
      const decoded = decodePhotoData(logoData);
      if (!decoded) redirect(orgPageTab(orgId, "&pageError=logo"));
      const extension = decoded.mimeType === "image/png" ? "png" : decoded.mimeType === "image/webp" ? "webp" : "jpg";
      newPath = `${orgId}/logo-${randomBytes(8).toString("hex")}.${extension}`;
      const { error: uploadError } = await storage.storage
        .from(PROGRAM_LOGO_BUCKET)
        .upload(newPath, decoded.buffer, { contentType: decoded.mimeType, upsert: false });
      if (uploadError) redirect(orgPageTab(orgId, "&pageError=logo"));
    }
    const { data: oldPath, error: logoError } = await client.rpc("set_org_program_logo", { p_org_id: orgId, p_logo_path: newPath });
    if (logoError) {
      if (newPath) await storage.storage.from(PROGRAM_LOGO_BUCKET).remove([newPath]);
      redirect(orgPageTab(orgId, "&pageError=logo"));
    }
    if (typeof oldPath === "string" && oldPath !== newPath) await storage.storage.from(PROGRAM_LOGO_BUCKET).remove([oldPath]);
  }
  revalidatePath("/advisor/organisation");
  if (slug) revalidatePath(`/p/${slug}`);
  redirect(orgPageTab(orgId, "&pageSaved=1"));
}

/** Von der oeffentlichen Seite: bringt den eingegebenen Code in den bekannten Beitrittsweg. */
export async function enterProgramCodeFromPageAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (code.length !== 8) redirect(`/p/${slug}?code=invalid`);
  redirect(`/programm/code/${code}`);
}

/** Programmplan: Veranstaltung anlegen oder aendern. Nur der Inhaber; die Datenbank prueft das. */
export async function saveProgramEventAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgPlanTab(orgId));
  // Deutsche Zeit, nicht die des Servers (Vercel laeuft in UTC).
  const whenIso = berlinLocalToIso(String(formData.get("startsAt") ?? ""));
  const kind = String(formData.get("kind") ?? "education");
  if (!whenIso || !["education", "internal", "external"].includes(kind)) {
    redirect(orgPlanTab(orgId, "&planError=invalid"));
  }
  const when = new Date(whenIso as string);
  const { error } = await client.rpc("save_program_event", {
    p_org_id: orgId,
    p_event_id: String(formData.get("eventId") ?? "") || null,
    p_title: String(formData.get("title") ?? "").slice(0, 160),
    p_kind: kind,
    p_starts_at: when.toISOString(),
    p_location: String(formData.get("location") ?? "").slice(0, 200),
    p_notes: String(formData.get("notes") ?? "").slice(0, 2000),
    p_todos: String(formData.get("todos") ?? "").slice(0, 2000),
    p_format_id: UUID_RE.test(String(formData.get("formatId") ?? "")) ? String(formData.get("formatId")) : null,
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgPlanTab(orgId, error ? "&planError=failed" : "&planSaved=1"));
}

/**
 * Mehrere Veranstaltungen auf einmal (Sammel-Eintrag im Programmplan, 05.11.2026): die Vorschlaege aus Text oder
 * Diktat, von der Person geprueft. Jede geht durch dieselbe Datenbankfunktion wie das einzelne Formular.
 */
export async function createProgramEventsAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgPlanTab(orgId));
  let rows: unknown[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("events") ?? "[]"));
    rows = Array.isArray(parsed) ? parsed.slice(0, 40) : [];
  } catch {
    rows = [];
  }
  let created = 0;
  for (const raw of rows) {
    const row = raw as { title?: unknown; day?: unknown; time?: unknown; location?: unknown; formatId?: unknown; kind?: unknown };
    const startsAt = berlinToIso(String(row.day ?? ""), typeof row.time === "string" && row.time ? row.time : "00:00");
    const title = String(row.title ?? "").trim().slice(0, 160);
    const kind = ["education", "internal", "external"].includes(String(row.kind)) ? String(row.kind) : "education";
    if (!startsAt || !title) continue;
    const { error } = await client.rpc("save_program_event", {
      p_org_id: orgId,
      p_event_id: null,
      p_title: title,
      p_kind: kind,
      p_starts_at: startsAt,
      p_location: String(row.location ?? "").slice(0, 200),
      p_notes: "",
      p_todos: "",
      p_format_id: UUID_RE.test(String(row.formatId ?? "")) ? String(row.formatId) : null,
    });
    if (!error) created += 1;
  }
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgPlanTab(orgId, created > 0 ? `&planCreated=${created}#plan-social` : "&planError=failed"));
}

/** Formate (Masterclass, Fireside Chat ...): anlegen und loeschen - nur die Inhaberin. Rueckweg: Plan oder Einrichten. */
const formatsBack = (orgId: string, formData: FormData, extra = "") =>
  formData.get("back") === "features" ? `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=features${extra}#formats` : orgPlanTab(orgId, `${extra}#formats`);

export async function saveEventFormatAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgPlanTab(orgId));
  const { error } = await client.rpc("save_program_event_format", { p_org_id: orgId, p_label: String(formData.get("label") ?? "").slice(0, 60) });
  revalidatePath("/advisor/organisation");
  redirect(formatsBack(orgId, formData, error ? "&formatError=1" : ""));
}

export async function deleteEventFormatAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgPlanTab(orgId));
  await client.rpc("delete_program_event_format", { p_format_id: String(formData.get("formatId") ?? "") });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(formatsBack(orgId, formData));
}

export async function deleteProgramEventAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgPlanTab(orgId));
  await client.rpc("delete_program_event", { p_event_id: String(formData.get("eventId") ?? "") });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgPlanTab(orgId));
}

/** Speaker einer Veranstaltung: nur der Inhaber; die Datenbank prueft das und verlangt Personen derselben Organisation. */
export async function setEventExpertsAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const client = await requireUser(orgPlanTab(orgId));
  const ids = formData.getAll("expertId").map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const { error } = await client.rpc("set_event_experts", { p_event_id: eventId, p_expert_ids: ids });
  revalidatePath("/advisor/organisation");
  redirect(orgPlanTab(orgId, error ? "&planError=invalid" : `&planSaved=1&open=${encodeURIComponent(eventId)}`));
}

/** Lernbereich: Module und Lektionen mit Links. Nur der Inhaber; die Datenbank prueft das und verlangt https. */
const intOrNull = (value: FormDataEntryValue | null, min: number, max: number) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export async function saveLearningModuleAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgLearningTab(orgId));
  const { error } = await client.rpc("save_learning_module", {
    p_org_id: orgId,
    p_module_id: String(formData.get("moduleId") ?? "") || null,
    p_title: String(formData.get("title") ?? "").slice(0, 120),
    p_description: String(formData.get("description") ?? "").slice(0, 500),
    p_position: intOrNull(formData.get("position"), 0, 9999),
    // Der Kreis wird getrennt festgelegt (setModuleAudienceAction); hier bleibt er unveraendert.
    p_published: null,
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgLearningTab(orgId, error ? "&learningError=failed#learning-title" : "#learning-title"));
}

/** Fuer wen ein Modul sichtbar ist: alle Teams, einzelne Teams, einzelne Personen. Die Datenbank prueft jede Person und jedes Team. */
export async function setModuleAudienceAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgLearningTab(orgId));
  const ids = (name: string) => formData.getAll(name).map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const { error } = await client.rpc("set_module_audience", {
    p_module_id: String(formData.get("moduleId") ?? ""),
    p_all_programs: formData.get("allPrograms") === "on",
    p_program_ids: ids("programId"),
    p_person_ids: ids("personId"),
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgLearningTab(orgId, error ? "&learningError=audience#learning-title" : "#learning-title"));
}

export async function deleteLearningModuleAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgLearningTab(orgId));
  await client.rpc("delete_learning_module", { p_module_id: String(formData.get("moduleId") ?? "") });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgLearningTab(orgId, "#learning-title"));
}

export async function saveLearningLessonAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgLearningTab(orgId));
  const url = String(formData.get("url") ?? "").trim().slice(0, 500);
  if (!/^https:\/\/\S+$/i.test(url)) redirect(orgLearningTab(orgId, "&learningError=invalid#learning-title"));
  const { error } = await client.rpc("save_learning_lesson", {
    p_module_id: String(formData.get("moduleId") ?? ""),
    p_lesson_id: String(formData.get("lessonId") ?? "") || null,
    p_title: String(formData.get("title") ?? "").slice(0, 160),
    p_note: String(formData.get("note") ?? "").slice(0, 500),
    p_url: url,
    p_minutes: intOrNull(formData.get("minutes"), 1, 600),
    p_speaker: String(formData.get("speaker") ?? "").slice(0, 120),
    p_position: intOrNull(formData.get("position"), 0, 9999),
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgLearningTab(orgId, error ? "&learningError=failed#learning-title" : "#learning-title"));
}

export async function deleteLearningLessonAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgLearningTab(orgId));
  await client.rpc("delete_learning_lesson", { p_lesson_id: String(formData.get("lessonId") ?? "") });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgLearningTab(orgId, "#learning-title"));
}

/** Links zu den Programmunterlagen: nur der Inhaber; die Datenbank prueft das und verlangt https. */
export async function saveProgramMaterialAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgMaterialsTab(orgId));
  const url = String(formData.get("url") ?? "").trim().slice(0, 500);
  if (!/^https:\/\/\S+$/i.test(url)) redirect(orgMaterialsTab(orgId, "&materialError=invalid#materials-title"));
  const { error } = await client.rpc("save_program_material", {
    p_org_id: orgId,
    p_material_id: String(formData.get("materialId") ?? "") || null,
    p_title: String(formData.get("title") ?? "").slice(0, 160),
    p_url: url,
    p_note: String(formData.get("note") ?? "").slice(0, 300),
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgMaterialsTab(orgId, error ? "&materialError=failed#materials-title" : "#materials-title"));
}

export async function deleteProgramMaterialAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgMaterialsTab(orgId));
  await client.rpc("delete_program_material", { p_material_id: String(formData.get("materialId") ?? "") });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgMaterialsTab(orgId, "#materials-title"));
}

/** Ohne Schema wird https:// vorangestellt; alles andere als https lehnt die Datenbank ab. */
const withHttps = (value: string, max: number) => {
  const text = value.trim().slice(0, max);
  return text && !/^[a-z][a-z0-9+.-]*:/i.test(text) ? `https://${text}` : text;
};

/** Experten und Speaker: nur der Inhaber schreibt; die Datenbank prueft das. Die Liste sieht keine Person ausserhalb der Organisation. */
export async function saveProgramExpertAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgExpertsTab(orgId));
  const text = (name: string, max: number) => String(formData.get(name) ?? "").slice(0, max);
  const { error } = await client.rpc("save_program_expert", {
    p_org_id: orgId,
    p_expert_id: String(formData.get("expertId") ?? "") || null,
    p_name: text("name", 120),
    p_topic: text("topic", 200),
    p_company: text("company", 120),
    p_email: text("email", 200),
    p_phone: text("phone", 50),
    p_website: withHttps(text("website", 300), 300),
    p_offer_link: withHttps(text("offerLink", 500), 500),
    p_note: text("note", 1000),
  });
  revalidatePath("/advisor/organisation");
  redirect(orgExpertsTab(orgId, error ? "&expertError=failed#experts-title" : "#experts-title"));
}

export async function setProgramExpertArchivedAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgExpertsTab(orgId));
  await client.rpc("set_program_expert_archived", {
    p_expert_id: String(formData.get("expertId") ?? ""),
    p_archived: formData.get("archived") === "yes",
  });
  revalidatePath("/advisor/organisation");
  redirect(orgExpertsTab(orgId, "#experts-title"));
}

export async function deleteProgramExpertAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgExpertsTab(orgId));
  await client.rpc("delete_program_expert", { p_expert_id: String(formData.get("expertId") ?? "") });
  revalidatePath("/advisor/organisation");
  redirect(orgExpertsTab(orgId, "#experts-title"));
}

/** Teilnahme eintragen (Inhaber oder Bezugsperson des Teams); leer nimmt den Eintrag zurueck. */
export async function setProgramAttendanceAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgPlanTab(orgId));
  const status = String(formData.get("status") ?? "");
  await client.rpc("set_program_attendance", {
    p_event_id: String(formData.get("eventId") ?? ""),
    p_program_id: String(formData.get("programId") ?? ""),
    p_status: ["present", "absent", "excused"].includes(status) ? status : null,
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgPlanTab(orgId, `&open=${encodeURIComponent(String(formData.get("eventId") ?? ""))}`));
}

/**
 * Zusage zu einer Veranstaltung (Team-Mitglied, vor Beginn). `whole=1` traegt sie fuer alle ein,
 * die noch nicht selbst geantwortet haben; leer nimmt die eigene zurueck.
 */
export async function setProgramEventRsvpAction(formData: FormData) {
  const client = await requireUser("/programm");
  const eventId = String(formData.get("eventId") ?? "");
  const response = String(formData.get("response") ?? "");
  await client.rpc("set_program_event_rsvp", {
    p_event_id: eventId,
    p_program_id: String(formData.get("programId") ?? ""),
    p_response: response === "yes" || response === "no" ? response : null,
    p_whole_team: formData.get("whole") === "1",
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/organisation");
  redirect(`/programm#event-${encodeURIComponent(eventId)}`);
}

/** Zurueck nur auf die eigenen Seiten: /programm oder das Erfolge-Tab des Teams. */
const outcomeReturn = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "");
  return text === "/programm" || /^\/advisor\/programm\/[0-9a-f-]{36}\?tab=erfolge$/.test(text) ? text : "/programm";
};

/** Ein Ergebnis eintragen: das Team meldet, Inhaber und Bezugspersonen tragen direkt bestaetigt ein. */
export async function reportProgramOutcomeAction(formData: FormData) {
  const back = outcomeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  const date = String(formData.get("achievedOn") ?? "");
  await client.rpc("report_program_outcome", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_catalog_id: String(formData.get("catalogId") ?? ""),
    p_achieved_on: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10),
    p_note: String(formData.get("note") ?? "").slice(0, 500),
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}

export async function confirmProgramOutcomeAction(formData: FormData) {
  const back = outcomeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  await client.rpc("confirm_program_outcome", { p_outcome_id: String(formData.get("outcomeId") ?? "") });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}

export async function removeProgramOutcomeAction(formData: FormData) {
  const back = outcomeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  await client.rpc("remove_program_outcome", { p_outcome_id: String(formData.get("outcomeId") ?? "") });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}

/** Katalog der Organisation: Punkt ergaenzen, Sterne aendern, ein- oder ausschalten. Nur der Inhaber. */
export async function saveOutcomeCatalogItemAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgSuccessTab(orgId));
  const catalogId = String(formData.get("catalogId") ?? "");
  const { error } = await client.rpc("save_outcome_catalog_item", {
    p_org_id: orgId,
    p_catalog_id: catalogId || null,
    p_title: String(formData.get("title") ?? "").slice(0, 120),
    p_stars: Number(formData.get("stars") ?? 1) || 1,
    p_active: formData.has("activeFlag") ? formData.get("active") === "yes" : formData.get("active") !== "no",
  });
  revalidatePath("/advisor/organisation");
  redirect(orgSuccessTab(orgId, error ? "&successError=1" : ""));
}

/** Belohnung der Organisation anlegen oder aendern. Nur der Inhaber. */
export async function saveRewardAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgSuccessTab(orgId));
  const rewardId = String(formData.get("rewardId") ?? "");
  const { error } = await client.rpc("save_reward", {
    p_org_id: orgId,
    p_reward_id: rewardId || null,
    p_stars: Math.min(200, Math.max(1, Number(formData.get("stars") ?? 1) || 1)),
    p_title: String(formData.get("title") ?? "").slice(0, 120),
    p_description: String(formData.get("description") ?? "").slice(0, 500),
    p_active: formData.has("activeFlag") ? formData.get("active") === "yes" : true,
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(orgSuccessTab(orgId, error ? "&successError=1" : ""));
}

export async function setRewardRedeemedAction(formData: FormData) {
  const back = outcomeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  await client.rpc("set_reward_redeemed", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_reward_id: String(formData.get("rewardId") ?? ""),
    p_redeemed: formData.get("redeemed") === "yes",
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}

/** Der eigene Satz zu einem Erfolg - jede Seite schreibt nur ihren; leer loescht ihn. */
export async function saveOutcomeCommentAction(formData: FormData) {
  const back = outcomeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  await client.rpc("save_outcome_comment", {
    p_outcome_id: String(formData.get("outcomeId") ?? ""),
    p_body: String(formData.get("body") ?? "").slice(0, 500),
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}

/** Ein Gespraech zum Stand festhalten, mit gemeinsamer Zusammenfassung und optional dem naechsten Termin. */
export async function saveCheckInAction(formData: FormData) {
  // Das Gespraech steht im Ueberblick der Team-Seite (ohne ?tab), nicht mehr unter Erfolge.
  const back = safeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  const date = (value: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? String(value) : null);
  await client.rpc("save_check_in", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_held_on: date(formData.get("heldOn")) ?? new Date().toISOString().slice(0, 10),
    p_summary: String(formData.get("summary") ?? "").slice(0, 2000),
    p_next_on: date(formData.get("nextOn")),
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}
