"use server";
import { connectPublicationVisibility } from "@/features/connect/connectRollout";

import { normalizeSafeInternalPath } from "@/features/auth/safeInternalPath";
import { connectPublishError } from "@/features/connect/connectPublishError";
import { savedPublicationStatus } from "@/features/connect/connectLifecycle";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { getIdentityGaps } from "@/features/profile/identityReadiness";
import { getConnectListing, getOwnConnectProfile } from "@/features/connect/connectData";
import { decodePhotoData } from "@/features/connect/connectPhotoData";
import { notifySavedSearchMatches } from "@/features/connect/savedSearchNotifications";
import {
  notifyConnectContactRequest,
  notifyConnectMessage,
} from "@/features/connect/connectNotifications";
import { getPersonCore } from "@/features/profile/personCoreData";
import { ConnectValidationError, normalizeConnectContactMessage, normalizeConnectMessageBody, parseConnectListing, parseConnectProfile, listingPublishable, profilePublishable } from "./connectValidation";
import { CONNECT_PHOTO_BUCKET, connectValuesForBasePhoto } from "@/features/connect/connectBasePhoto";
import { randomUUID } from "node:crypto";
import { requireSignedInForMessages } from "@/features/connect/conversationAccess";

async function context() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login?next=/connect");
  const { data: eligible } = await client.rpc("is_network_member");
  if (!eligible) redirect("/dashboard");
  return { client, user };
}
function refresh() { ["/connect", "/connect/my", "/connect/profile", "/dashboard", "/sitemap.xml"].forEach((path) => revalidatePath(path)); }
function refreshContacts(listingId?: string) {
  refresh(); revalidatePath("/connect/contacts");
  if (listingId) revalidatePath(`/connect/listings/${listingId}`);
}
function refreshMessaging(conversationId?: string) {
  refreshContacts();
  revalidatePath("/", "layout");
  if (conversationId) revalidatePath(`/messages/${conversationId}`);
}
function safeConnectRedirect(value: FormDataEntryValue | null, fallback = "/connect/contacts") {
  const path = normalizeSafeInternalPath(String(value ?? ""), fallback);
  return (/^\/connect(?:[/?#]|$)/.test(path) || /^\/messages\/[0-9a-f-]+$/i.test(path)) ? path : fallback;
}

export async function saveConnectProfileAction(formData: FormData) {
  const { client, user } = await context();
  // Identitaet kommt aus dem Kern, nicht aus diesem Formular - sie wird auf
  // /profile gepflegt. Ohne Kernangaben bleibt das Profil speicherbar, aber
  // nicht veroeffentlichbar; profilePublishable faengt das ab.
  const identity = await getPersonCore(client, user.id);
  let values: ReturnType<typeof parseConnectProfile>;
  try { values = parseConnectProfile(formData, identity); }
  catch (error) { redirect(`/connect/profile?error=${error instanceof ConnectValidationError ? error.code : "save"}`); }
  const publish = formData.get("intent") === "publish";
  if (publish && !profilePublishable(values)) {
    // "Ergaenze alle notwendigen Angaben" hat niemandem geholfen: Die
    // Identitaet wird auf /profile gepflegt, die Rollen hier. Ohne zu sagen,
    // welches von beiden fehlt, schickt die Meldung Leute im Kreis.
    const identityGaps = getIdentityGaps({
      display_name: values.display_name, headline: values.headline, bio: values.bio,
    });
    redirect(`/connect/profile?error=${identityGaps.length ? "identity_incomplete" : "roles_missing"}`);
  }
  const currentProfile = await client.from("network_profiles").select("status,published_at,photo_path,photo_source,photo_avatar_id,visibility,public_slug").eq("user_id", user.id).maybeSingle();
  if (currentProfile.error) redirect("/connect/profile?error=save");
  const nextProfileStatus = currentProfile.data?.status === "active" ? "active" : publish ? "active" : currentProfile.data?.status ?? "draft";
  if (nextProfileStatus === "active" && !profilePublishable(values)) redirect("/connect/profile?error=identity_incomplete");
  const profileVisibility = connectPublicationVisibility(formData.get("visibility"));
  if (profileVisibility === "public" && currentProfile.data?.visibility !== "public" && formData.get("confirm_public_visibility") !== "yes") {
    redirect("/connect/profile?error=public_confirmation");
  }
  const photoChoice = String(formData.get("photo_choice") ?? "keep");
  let uploadedPath: string | null = null;
  let photoValues: Record<string, string | null> = {};

  if (photoChoice === "none") {
    photoValues = { ...photoValues, photo_source: null, photo_avatar_id: null, photo_path: null };
  } else if (photoChoice === "existing") {
    // Eine Illustration wird als Kennung uebernommen, ein eigenes Basisfoto
    // als eigene Kopie im Connect-Eimer - das Original bleibt privat. Siehe
    // `connectBasePhoto.ts`.
    const base = await getProfileBasicsRow(client, user.id).catch(() => null);
    const reused = await connectValuesForBasePhoto(client, user.id, base);
    if (!reused.photo_source) redirect("/connect/profile?error=photo_reuse");
    if (reused.photo_path) uploadedPath = reused.photo_path;
    photoValues = { ...photoValues, ...reused };
  } else if (photoChoice === "upload") {
    const upload = await uploadConnectPhoto(client, user.id, String(formData.get("photo_image_data") ?? ""));
    if (!upload) redirect("/connect/profile?error=photo_upload");
    uploadedPath = upload;
    photoValues = { ...photoValues, photo_source: "network_upload", photo_avatar_id: null, photo_path: upload };
  }
  const { error } = await client.from("network_profiles").upsert({
    user_id: user.id, ...values, status: nextProfileStatus,
    published_at: nextProfileStatus === "active" ? currentProfile.data?.published_at ?? new Date().toISOString() : currentProfile.data?.published_at ?? null, visibility: profileVisibility, ...photoValues,
  }, { onConflict: "user_id" });
  if (error) {
    if (uploadedPath) await client.storage.from(CONNECT_PHOTO_BUCKET).remove([uploadedPath]);
    redirect("/connect/profile?error=save");
  }
  const oldPath = currentProfile.data?.photo_path?.trim() || null;
  const nextPath = typeof photoValues.photo_path === "string" ? photoValues.photo_path : photoChoice === "keep" ? oldPath : null;
  if (oldPath && oldPath !== nextPath && oldPath.startsWith(`${user.id}/`)) {
    await client.storage.from(CONNECT_PHOTO_BUCKET).remove([oldPath]);
  }
  refresh();
  if (currentProfile.data?.public_slug) revalidatePath(`/connect/p/${currentProfile.data.public_slug}`);
  if (publish && formData.get("next")) redirect(safeConnectRedirect(formData.get("next"), "/connect?profile=published"));
  redirect(`/connect/profile?saved=${nextProfileStatus === "active" ? "published" : "draft"}`);
}

async function uploadConnectPhoto(client: Awaited<ReturnType<typeof createClient>>, userId: string, value: string) {
  const decoded = decodePhotoData(value);
  if (!decoded) return null;
  const extension = decoded.mimeType === "image/png" ? "png" : decoded.mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await client.storage.from(CONNECT_PHOTO_BUCKET).upload(path, decoded.buffer, { contentType: decoded.mimeType, upsert: false });
  return error ? null : path;
}


export async function saveConnectListingAction(formData: FormData) {
  const { client, user } = await context(); const id = String(formData.get("id") ?? "").trim();
  const rawDirection = String(formData.get("direction") ?? "seeking"); const rawCategory = String(formData.get("category") ?? "expertise");
  const editRoute = id ? `/connect/listings/${id}/edit` : `/connect/listings/new?direction=${rawDirection}&category=${rawCategory}`;
  let values: ReturnType<typeof parseConnectListing>;
  try { values = parseConnectListing(formData); }
  catch (error) { redirect(`${editRoute}${editRoute.includes("?") ? "&" : "?"}error=${error instanceof ConnectValidationError ? error.code : "save"}`); }
  const publish = formData.get("intent") === "publish";
  if (values.starts_on && values.ends_on && values.ends_on < values.starts_on) redirect(`${editRoute}${editRoute.includes("?") ? "&" : "?"}error=invalid_dates`);
  if (publish && !listingPublishable(values)) redirect(`${editRoute}${editRoute.includes("?") ? "&" : "?"}error=incomplete`);
  const currentListing = id
    ? await client.from("network_listings").select("status,published_at,expires_at,visibility,public_slug").eq("id", id).eq("owner_user_id", user.id).maybeSingle()
    : { data: null, error: null };
  if (currentListing.error || (id && !currentListing.data)) redirect("/connect/my?error=save");
  const nextStatus = savedPublicationStatus(currentListing.data?.status, publish);
  if (nextStatus === "active" && !listingPublishable(values)) redirect(`${editRoute}${editRoute.includes("?") ? "&" : "?"}error=incomplete`);
  const listingVisibility = connectPublicationVisibility(formData.get("visibility"));
  if (listingVisibility === "public" && currentListing.data?.visibility !== "public" && formData.get("confirm_public_visibility") !== "yes") {
    redirect(`${editRoute}${editRoute.includes("?") ? "&" : "?"}error=public_confirmation`);
  }
  const payload = { owner_user_id: user.id, ...values, status: nextStatus,
    visibility: listingVisibility,
    published_at: currentListing.data?.published_at ?? (nextStatus === "active" ? new Date().toISOString() : null),
    expires_at: currentListing.data?.expires_at ?? (nextStatus === "active" ? new Date(Date.now() + 60 * 86400000).toISOString() : null) };
  const result = id
    ? await client.from("network_listings").update(payload).eq("id", id).eq("owner_user_id", user.id).select("id,public_slug").single()
    : await client.from("network_listings").insert(payload).select("id,public_slug").single();
  if (result.error) redirect(`/connect/my?error=${result.error.message.includes("active_network_profile_required") ? "profile" : "save"}`);

  // Abgleich mit gespeicherten Suchen, im Moment des Erscheinens. Nur beim
  // Veroeffentlichen: Ein Entwurf ist fuer niemanden sichtbar.
  if (nextStatus === "active" && currentListing.data?.status !== "active") {
    await notifySavedSearchMatches(client, {
      kind: "listing",
      id: result.data.id,
      ownerUserId: user.id,
      title: values.title,
      summary: values.summary,
      topics: values.topics,
      industries: values.industries,
      locations: values.locations,
      geographicScope: values.geographic_scope ?? null,
      remoteMode: values.remote_mode ?? null,
      direction: values.direction,
      category: values.category,
    });

    // Und die Auswertung auf Zugaenge - erst jetzt, weil ein Entwurf fuer
    // niemanden sichtbar ist, auch nicht fuer ein Modell. Sie wandert in eine
    // Warteschlange und wird gerechnet, wenn ein Modell laeuft; hier wartet
    // niemand darauf.
    await client.rpc("enqueue_ai_job", {
      p_job_type: "connect_resource_extraction",
      p_source_table: "network_listings",
      p_source_id: result.data.id,
    });
  }

  refresh();
  if (result.data.public_slug) revalidatePath(`/connect/l/${result.data.public_slug}`);
  redirect(`/connect/listings/${result.data.id}?saved=${nextStatus === "active" ? "published" : "draft"}`);
}

export async function changeConnectListingStatusAction(formData: FormData) {
  const { client } = await context(); const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (formData.get("confirm") !== "on") redirect("/connect/my?error=save");
  const { error } = await client.rpc("transition_connect_content", {
    p_kind: "listing", p_id: id, p_action: intent,
    p_expected: formData.get("expected"), p_confirm: true,
  });
  if (error) {
    const reason = connectPublishError(error.message);
    if (reason === "publish_title" || reason === "publish_summary") redirect(`/connect/listings/${id}/edit?error=${reason}`);
    redirect(`/connect/my?error=${reason}`);
  }
  revalidatePath("/connect/l/[publicSlug]", "page");
  refresh(); redirect(`/connect/my?changed=${intent}`);
}

export async function requestConnectContactAction(formData: FormData) {
  const { client, user } = await context(); const listingId = String(formData.get("listing_id") ?? "").trim();
  const message = normalizeConnectContactMessage(formData.get("message"));
  if (!listingId) redirect("/connect?error=contact");
  if (!message) redirect(`/connect/listings/${listingId}/contact?error=message`);
  const { data: requestId, error } = await client.rpc("request_network_contact", { p_listing_id: listingId, p_message: message });
  if (error) {
    const reason = error.message.includes("sender_profile_required") ? "contact_profile"
      : error.message.includes("listing_unavailable") || error.message.includes("recipient_unavailable") ? "contact_unavailable"
      : error.message.includes("self_request") ? "contact_self" : "contact";
    redirect(`/connect/listings/${listingId}/contact?error=${reason}`);
  }
  // Bestenfalls und nach dem Schreiben: Die Anfrage steht, auch wenn die Mail
  // nicht rausgeht.
  const listing = await getConnectListing(client, listingId);
  if (requestId && listing) {
    const sender = await getOwnConnectProfile(client, user.id);
    await notifyConnectContactRequest(client, String(requestId), listing.owner_user_id, sender?.display_name ?? null);
  }
  refreshContacts(listingId); redirect(`/connect/listings/${listingId}?contact=sent`);
}

/**
 * Jemanden anschreiben, ohne dass er etwas ausgeschrieben hat.
 *
 * Eine eigene Aktion neben `requestConnectContactAction`, wie in der Datenbank
 * auch eine eigene Funktion daneben steht: Der Weg ueber die Anzeige
 * funktioniert und wird benutzt - ihn fuer einen zweiten Fall umzubauen waere
 * ein Risiko ohne Gegenwert.
 *
 * Die Bedingung "nur mit eigenem veroeffentlichten Profil" prueft die
 * Datenbank. Hier wird sie nur in einen Satz uebersetzt, den man lesen kann.
 */
export async function requestConnectPersonContactAction(formData: FormData) {
  const { client, user } = await context();
  const recipientUserId = String(formData.get("recipient_user_id") ?? "").trim();
  const message = normalizeConnectContactMessage(formData.get("message"));
  const back = `/connect/people/${recipientUserId}`;
  if (!recipientUserId) redirect("/connect/people?error=contact");
  if (!message) redirect(`${back}/contact?error=message`);

  const { data: requestId, error } = await client.rpc("request_network_person_contact", {
    p_recipient_user_id: recipientUserId,
    p_message: message,
  });
  if (error) {
    const reason = error.message.includes("sender_profile_required") ? "contact_profile"
      : error.message.includes("recipient_unavailable") ? "contact_unavailable"
      : error.message.includes("interaction_blocked") ? "contact_unavailable"
      : error.message.includes("self_request") ? "contact_self" : "contact";
    redirect(`${back}/contact?error=${reason}`);
  }

  // Bestenfalls und nach dem Schreiben: Die Anfrage steht, auch wenn die
  // Benachrichtigung nicht rausgeht.
  if (requestId) {
    const sender = await getOwnConnectProfile(client, user.id);
    await notifyConnectContactRequest(client, String(requestId), recipientUserId, sender?.display_name ?? null);
  }

  refreshContacts();
  redirect(`${back}?contact=sent`);
}

export async function respondConnectContactAction(formData: FormData) {
  const { client } = await context(); const id = String(formData.get("id") ?? "").trim();
  const response = String(formData.get("response") ?? "");
  if (!id || (response !== "accepted" && response !== "declined")) redirect("/connect/contacts?error=response");
  const { error } = await client.rpc("respond_network_contact", { p_request_id: id, p_response: response });
  if (error) redirect("/connect/contacts?error=response");
  refreshContacts(); redirect(`/connect/contacts?changed=${response}`);
}

export async function cancelConnectContactAction(formData: FormData) {
  const { client } = await context(); const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/connect/contacts?error=cancel");
  const { error } = await client.rpc("cancel_network_contact", { p_request_id: id });
  if (error) redirect("/connect/contacts?error=cancel");
  refreshContacts(); redirect("/connect/contacts?changed=canceled");
}

export async function sendConnectMessageAction(formData: FormData) {
  const { client, user } = await requireSignedInForMessages();
  const conversationId = String(formData.get("conversation_id") ?? "").trim();
  const body = normalizeConnectMessageBody(formData.get("body"));
  if (!conversationId) redirect("/connect/contacts?error=message");
  if (!body) redirect(`/messages/${conversationId}?error=message`);
  const { data: messageId, error } = await client.rpc("send_network_message", {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) redirect(`/messages/${conversationId}?error=${error.message.includes("interaction_blocked") ? "blocked" : "message"}`);
  if (messageId) {
    const sender = await getOwnConnectProfile(client, user.id);
    await notifyConnectMessage(client, String(messageId), conversationId, sender?.display_name ?? null);
  }
  refreshMessaging(conversationId);
  redirect(`/messages/${conversationId}?sent=1`);
}

export async function blockConnectUserAction(formData: FormData) {
  const { client } = await requireSignedInForMessages();
  const otherUserId = String(formData.get("other_user_id") ?? "").trim();
  const returnTo = safeConnectRedirect(formData.get("return_to"));
  if (!otherUserId) redirect(`${returnTo}?error=safety`);
  const { error } = await client.rpc("block_network_user", { p_blocked_user_id: otherUserId });
  refreshMessaging();
  redirect(`${returnTo}?${error ? "error=safety" : "safety=blocked"}`);
}

export async function unblockConnectUserAction(formData: FormData) {
  const { client } = await requireSignedInForMessages();
  const otherUserId = String(formData.get("other_user_id") ?? "").trim();
  const returnTo = safeConnectRedirect(formData.get("return_to"));
  if (!otherUserId) redirect(`${returnTo}?error=safety`);
  const { error } = await client.rpc("unblock_network_user", { p_blocked_user_id: otherUserId });
  refreshMessaging();
  redirect(`${returnTo}?${error ? "error=safety" : "safety=unblocked"}`);
}

export async function reportConnectInteractionAction(formData: FormData) {
  const { client } = await requireSignedInForMessages();
  const contactRequestId = String(formData.get("contact_request_id") ?? "").trim();
  const conversationId = String(formData.get("conversation_id") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  const returnTo = safeConnectRedirect(formData.get("return_to"));
  if ((!conversationId && !contactRequestId) || !["spam", "harassment", "misleading", "other"].includes(category) || comment.length > 1000) {
    redirect(`${returnTo}?error=report`);
  }
  // A conversation ID takes precedence; never fall back after a denied RPC.
  const report = { p_category: category, p_comment: comment || null };
  const { error } = conversationId
    ? await client.rpc("report_network_conversation", { ...report, p_conversation_id: conversationId })
    : await client.rpc("report_network_interaction", { ...report, p_contact_request_id: contactRequestId });
  redirect(`${returnTo}?${error ? "error=report" : "safety=reported"}`);
}

export async function markConnectConversationReadAction(conversationId: string) {
  const { client } = await requireSignedInForMessages();
  const { error } = await client.rpc("mark_network_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (error) return { ok: false };
  refreshMessaging(conversationId);
  return { ok: true };
}

