"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { getPersonCore } from "@/features/profile/personCoreData";
import { ConnectValidationError, normalizeConnectContactMessage, normalizeConnectMessageBody, parseConnectListing, parseConnectProfile, listingPublishable, profilePublishable } from "./connectValidation";
import { normalizeAvatarId } from "@/features/profile/avatarLibrary";
import { randomUUID } from "node:crypto";

const CONNECT_PHOTO_BUCKET = "network-profile-images";

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
  if (conversationId) revalidatePath(`/connect/messages/${conversationId}`);
}
function safeConnectRedirect(value: FormDataEntryValue | null, fallback = "/connect/contacts") {
  const path = String(value ?? "").trim();
  return path.startsWith("/connect") && !path.startsWith("//") ? path : fallback;
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
  if (publish && !profilePublishable(values)) redirect("/connect/profile?error=incomplete");
  const currentProfile = await client.from("network_profiles").select("photo_path,photo_source,photo_avatar_id,photo_visibility,visibility,public_slug").eq("user_id", user.id).maybeSingle();
  const profileVisibility = formData.get("visibility") === "public" ? "public" : "members_only";
  if (profileVisibility === "public" && currentProfile.data?.visibility !== "public" && formData.get("confirm_public_visibility") !== "yes") {
    redirect("/connect/profile?error=public_confirmation");
  }
  const photoChoice = String(formData.get("photo_choice") ?? "keep");
  const visibility = formData.get("photo_visibility") === "public_allowed" ? "public_allowed" : "platform_only";
  let uploadedPath: string | null = null;
  let photoValues: Record<string, string | null> = { photo_visibility: visibility };

  if (photoChoice === "none") {
    photoValues = { ...photoValues, photo_source: null, photo_avatar_id: null, photo_path: null };
  } else if (photoChoice === "existing") {
    const base = await getProfileBasicsRow(client, user.id).catch(() => null);
    const avatarId = normalizeAvatarId(base?.avatar_id);
    if (avatarId) {
      photoValues = { ...photoValues, photo_source: "profile_avatar", photo_avatar_id: avatarId, photo_path: null };
    } else redirect("/connect/profile?error=photo_reuse");
  } else if (photoChoice === "upload") {
    const upload = await uploadConnectPhoto(client, user.id, String(formData.get("photo_image_data") ?? ""));
    if (!upload) redirect("/connect/profile?error=photo_upload");
    uploadedPath = upload;
    photoValues = { ...photoValues, photo_source: "network_upload", photo_avatar_id: null, photo_path: upload };
  }
  const { error } = await client.from("network_profiles").upsert({
    user_id: user.id, ...values, status: publish ? "active" : "draft",
    published_at: publish ? new Date().toISOString() : null, visibility: profileVisibility, ...photoValues,
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
  if (publish && !currentProfile.data) redirect(safeConnectRedirect(formData.get("next"), "/connect?profile=published"));
  redirect(`/connect/profile?saved=${publish ? "published" : "draft"}`);
}

function decodePhotoData(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.byteLength > 2 * 1024 * 1024) return null;
  return { buffer, mimeType: match[1] };
}

async function uploadConnectPhoto(client: Awaited<ReturnType<typeof createClient>>, userId: string, value: string) {
  const decoded = decodePhotoData(value);
  if (!decoded) return null;
  const extension = decoded.mimeType === "image/png" ? "png" : decoded.mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await client.storage.from(CONNECT_PHOTO_BUCKET).upload(path, decoded.buffer, { contentType: decoded.mimeType, upsert: false });
  return error ? null : path;
}


export async function reuseExistingProfileAction() {
  const { client, user } = await context();
  // Der Kern haelt Name, Headline, Bio, Expertise, Branchen und Region bereits
  // zusammengefuehrt; vorher wurde hier feldweise zwischen Basis- und
  // Discovery-Profil gemergt, inklusive der toten Spalte profiles.skills.
  // profiles.roles bleibt noetig, weil daraus die Connect-Rolle abgeleitet
  // wird - das ist Produktrolle, nicht Identitaet, und gehoert nicht in den Kern.
  const [core, base] = await Promise.all([
    getPersonCore(client, user.id),
    getProfileBasicsRow(client, user.id),
  ]);
  const { error } = await client.from("network_profiles").upsert({
    user_id: user.id, display_name: core?.display_name || "",
    headline: core?.headline || "", bio: core?.bio || "",
    expertise: core?.expertise || [], industries: core?.industries || [],
    location_region: core?.location_region || null, remote_mode: core?.remote_mode || null,
    network_roles: base?.roles?.includes("founder") ? ["founder"] : base?.roles?.includes("advisor") ? ["advisor_mentor"] : [],
    status: "draft", published_at: null,
  }, { onConflict: "user_id" });
  if (error) redirect("/connect/profile?error=reuse");
  refresh(); redirect("/connect/profile?reused=1");
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
    ? await client.from("network_listings").select("visibility,public_slug").eq("id", id).eq("owner_user_id", user.id).maybeSingle()
    : { data: null };
  const listingVisibility = formData.get("visibility") === "public" ? "public" : "members_only";
  if (listingVisibility === "public" && currentListing.data?.visibility !== "public" && formData.get("confirm_public_visibility") !== "yes") {
    redirect(`${editRoute}${editRoute.includes("?") ? "&" : "?"}error=public_confirmation`);
  }
  const payload = { owner_user_id: user.id, ...values, status: publish ? "active" : "draft",
    visibility: listingVisibility,
    published_at: publish ? new Date().toISOString() : null,
    expires_at: publish ? new Date(Date.now() + 60 * 86400000).toISOString() : null };
  const result = id
    ? await client.from("network_listings").update(payload).eq("id", id).eq("owner_user_id", user.id).select("id,public_slug").single()
    : await client.from("network_listings").insert(payload).select("id,public_slug").single();
  if (result.error) redirect(`/connect/my?error=${result.error.message.includes("active_network_profile_required") ? "profile" : "save"}`);
  refresh();
  if (result.data.public_slug) revalidatePath(`/connect/l/${result.data.public_slug}`);
  redirect(`/connect/listings/${result.data.id}?saved=${publish ? "published" : "draft"}`);
}

export async function changeConnectListingStatusAction(formData: FormData) {
  const { client, user } = await context(); const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const updates: Record<string, string | null> = intent === "pause" ? { status: "paused" }
    : intent === "complete" ? { status: "completed" }
    : intent === "renew" ? { status: "active", published_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60 * 86400000).toISOString() }
    : intent === "publish" ? { status: "active", published_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60 * 86400000).toISOString() }
    : {};
  if (Object.keys(updates).length) {
    const { data, error } = await client.from("network_listings").update(updates).eq("id", id).eq("owner_user_id", user.id).select("public_slug").maybeSingle();
    if (error) redirect("/connect/my?error=save");
    if (data?.public_slug) revalidatePath(`/connect/l/${data.public_slug}`);
  }
  refresh(); redirect(`/connect/my?changed=${intent}`);
}

export async function requestConnectContactAction(formData: FormData) {
  const { client } = await context(); const listingId = String(formData.get("listing_id") ?? "").trim();
  const message = normalizeConnectContactMessage(formData.get("message"));
  if (!listingId) redirect("/connect?error=contact");
  if (!message) redirect(`/connect/listings/${listingId}/contact?error=message`);
  const { error } = await client.rpc("request_network_contact", { p_listing_id: listingId, p_message: message });
  if (error) {
    const reason = error.message.includes("sender_profile_required") ? "contact_profile"
      : error.message.includes("listing_unavailable") || error.message.includes("recipient_unavailable") ? "contact_unavailable"
      : error.message.includes("self_request") ? "contact_self" : "contact";
    redirect(`/connect/listings/${listingId}/contact?error=${reason}`);
  }
  refreshContacts(listingId); redirect(`/connect/listings/${listingId}?contact=sent`);
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
  const { client } = await context();
  const conversationId = String(formData.get("conversation_id") ?? "").trim();
  const body = normalizeConnectMessageBody(formData.get("body"));
  if (!conversationId) redirect("/connect/contacts?error=message");
  if (!body) redirect(`/connect/messages/${conversationId}?error=message`);
  const { error } = await client.rpc("send_network_message", {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) redirect(`/connect/messages/${conversationId}?error=${error.message.includes("interaction_blocked") ? "blocked" : "message"}`);
  refreshMessaging(conversationId);
  redirect(`/connect/messages/${conversationId}?sent=1`);
}

export async function blockConnectUserAction(formData: FormData) {
  const { client } = await context();
  const otherUserId = String(formData.get("other_user_id") ?? "").trim();
  const returnTo = safeConnectRedirect(formData.get("return_to"));
  if (!otherUserId) redirect(`${returnTo}?error=safety`);
  const { error } = await client.rpc("block_network_user", { p_blocked_user_id: otherUserId });
  refreshMessaging();
  redirect(`${returnTo}?${error ? "error=safety" : "safety=blocked"}`);
}

export async function unblockConnectUserAction(formData: FormData) {
  const { client } = await context();
  const otherUserId = String(formData.get("other_user_id") ?? "").trim();
  const returnTo = safeConnectRedirect(formData.get("return_to"));
  if (!otherUserId) redirect(`${returnTo}?error=safety`);
  const { error } = await client.rpc("unblock_network_user", { p_blocked_user_id: otherUserId });
  refreshMessaging();
  redirect(`${returnTo}?${error ? "error=safety" : "safety=unblocked"}`);
}

export async function reportConnectInteractionAction(formData: FormData) {
  const { client } = await context();
  const contactRequestId = String(formData.get("contact_request_id") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  const returnTo = safeConnectRedirect(formData.get("return_to"));
  if (!contactRequestId || !["spam", "harassment", "misleading", "other"].includes(category) || comment.length > 1000) {
    redirect(`${returnTo}?error=report`);
  }
  const { error } = await client.rpc("report_network_interaction", {
    p_contact_request_id: contactRequestId,
    p_category: category,
    p_comment: comment || null,
  });
  redirect(`${returnTo}?${error ? "error=report" : "safety=reported"}`);
}

export async function markConnectConversationReadAction(conversationId: string) {
  const { client } = await context();
  const { error } = await client.rpc("mark_network_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (error) return { ok: false };
  refreshMessaging(conversationId);
  return { ok: true };
}
