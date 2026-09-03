"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { NetworkValidationError, normalizeNetworkContactMessage, normalizeNetworkMessageBody, parseNetworkListing, parseNetworkProfile, listingPublishable, profilePublishable } from "./networkValidation";
import { normalizeAvatarId } from "@/features/profile/avatarLibrary";
import { randomUUID } from "node:crypto";

const NETWORK_PHOTO_BUCKET = "network-profile-images";

async function context() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login?next=/network");
  const { data: eligible } = await client.rpc("is_network_member");
  if (!eligible) redirect("/dashboard");
  return { client, user };
}
function refresh() { ["/network", "/network/my", "/network/profile", "/dashboard"].forEach((path) => revalidatePath(path)); }
function refreshContacts(listingId?: string) {
  refresh(); revalidatePath("/network/contacts");
  if (listingId) revalidatePath(`/network/listings/${listingId}`);
}
function refreshMessaging(conversationId?: string) {
  refreshContacts();
  revalidatePath("/", "layout");
  if (conversationId) revalidatePath(`/network/messages/${conversationId}`);
}
function safeNetworkRedirect(value: FormDataEntryValue | null, fallback = "/network/contacts") {
  const path = String(value ?? "").trim();
  return path.startsWith("/network") && !path.startsWith("//") ? path : fallback;
}

export async function saveNetworkProfileAction(formData: FormData) {
  const { client, user } = await context();
  let values: ReturnType<typeof parseNetworkProfile>;
  try { values = parseNetworkProfile(formData); }
  catch (error) { redirect(`/network/profile?error=${error instanceof NetworkValidationError ? error.code : "save"}`); }
  const publish = formData.get("intent") === "publish";
  if (publish && !profilePublishable(values)) redirect("/network/profile?error=incomplete");
  const currentProfile = await client.from("network_profiles").select("photo_path,photo_source,photo_avatar_id,photo_visibility").eq("user_id", user.id).maybeSingle();
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
    } else redirect("/network/profile?error=photo_reuse");
  } else if (photoChoice === "upload") {
    const upload = await uploadNetworkPhoto(client, user.id, String(formData.get("photo_image_data") ?? ""));
    if (!upload) redirect("/network/profile?error=photo_upload");
    uploadedPath = upload;
    photoValues = { ...photoValues, photo_source: "network_upload", photo_avatar_id: null, photo_path: upload };
  }
  const { error } = await client.from("network_profiles").upsert({
    user_id: user.id, ...values, status: publish ? "active" : "draft",
    published_at: publish ? new Date().toISOString() : null, ...photoValues,
  }, { onConflict: "user_id" });
  if (error) {
    if (uploadedPath) await client.storage.from(NETWORK_PHOTO_BUCKET).remove([uploadedPath]);
    redirect("/network/profile?error=save");
  }
  const oldPath = currentProfile.data?.photo_path?.trim() || null;
  const nextPath = typeof photoValues.photo_path === "string" ? photoValues.photo_path : photoChoice === "keep" ? oldPath : null;
  if (oldPath && oldPath !== nextPath && oldPath.startsWith(`${user.id}/`)) {
    await client.storage.from(NETWORK_PHOTO_BUCKET).remove([oldPath]);
  }
  refresh();
  if (publish && !currentProfile.data) redirect("/network?profile=published");
  redirect(`/network/profile?saved=${publish ? "published" : "draft"}`);
}

function decodePhotoData(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.byteLength > 2 * 1024 * 1024) return null;
  return { buffer, mimeType: match[1] };
}

async function uploadNetworkPhoto(client: Awaited<ReturnType<typeof createClient>>, userId: string, value: string) {
  const decoded = decodePhotoData(value);
  if (!decoded) return null;
  const extension = decoded.mimeType === "image/png" ? "png" : decoded.mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await client.storage.from(NETWORK_PHOTO_BUCKET).upload(path, decoded.buffer, { contentType: decoded.mimeType, upsert: false });
  return error ? null : path;
}


export async function reuseExistingProfileAction() {
  const { client, user } = await context();
  const [base, discovery] = await Promise.all([
    getProfileBasicsRow(client, user.id),
    client.from("founder_discovery_profiles").select("display_name,headline,bio,expertise,industries,location_region,remote_mode").eq("user_id", user.id).maybeSingle(),
  ]);
  const source = discovery.data;
  const { error } = await client.from("network_profiles").upsert({
    user_id: user.id, display_name: source?.display_name || base?.display_name || "",
    headline: source?.headline || base?.headline || "", bio: source?.bio || "",
    expertise: source?.expertise || base?.skills || [], industries: source?.industries || [],
    location_region: source?.location_region || null, remote_mode: source?.remote_mode || null,
    network_roles: base?.roles?.includes("founder") ? ["founder"] : base?.roles?.includes("advisor") ? ["advisor_mentor"] : [],
    status: "draft", published_at: null,
  }, { onConflict: "user_id" });
  if (error) redirect("/network/profile?error=reuse");
  refresh(); redirect("/network/profile?reused=1");
}

export async function saveNetworkListingAction(formData: FormData) {
  const { client, user } = await context(); const id = String(formData.get("id") ?? "").trim();
  const rawDirection = String(formData.get("direction") ?? "seeking"); const rawCategory = String(formData.get("category") ?? "expertise");
  const editRoute = id ? `/network/listings/${id}/edit` : `/network/listings/new?direction=${rawDirection}&category=${rawCategory}`;
  let values: ReturnType<typeof parseNetworkListing>;
  try { values = parseNetworkListing(formData); }
  catch (error) { redirect(`${editRoute}${editRoute.includes("?") ? "&" : "?"}error=${error instanceof NetworkValidationError ? error.code : "save"}`); }
  const publish = formData.get("intent") === "publish";
  if (values.starts_on && values.ends_on && values.ends_on < values.starts_on) redirect(`${editRoute}${editRoute.includes("?") ? "&" : "?"}error=invalid_dates`);
  if (publish && !listingPublishable(values)) redirect(`${editRoute}${editRoute.includes("?") ? "&" : "?"}error=incomplete`);
  const payload = { owner_user_id: user.id, ...values, status: publish ? "active" : "draft",
    published_at: publish ? new Date().toISOString() : null,
    expires_at: publish ? new Date(Date.now() + 60 * 86400000).toISOString() : null };
  const result = id
    ? await client.from("network_listings").update(payload).eq("id", id).eq("owner_user_id", user.id).select("id").single()
    : await client.from("network_listings").insert(payload).select("id").single();
  if (result.error) redirect(`/network/my?error=${result.error.message.includes("active_network_profile_required") ? "profile" : "save"}`);
  refresh(); redirect(`/network/listings/${result.data.id}?saved=${publish ? "published" : "draft"}`);
}

export async function changeNetworkListingStatusAction(formData: FormData) {
  const { client, user } = await context(); const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const updates: Record<string, string | null> = intent === "pause" ? { status: "paused" }
    : intent === "complete" ? { status: "completed" }
    : intent === "renew" ? { status: "active", published_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60 * 86400000).toISOString() }
    : intent === "publish" ? { status: "active", published_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60 * 86400000).toISOString() }
    : {};
  if (Object.keys(updates).length) {
    const { error } = await client.from("network_listings").update(updates).eq("id", id).eq("owner_user_id", user.id);
    if (error) redirect("/network/my?error=save");
  }
  refresh(); redirect(`/network/my?changed=${intent}`);
}

export async function requestNetworkContactAction(formData: FormData) {
  const { client } = await context(); const listingId = String(formData.get("listing_id") ?? "").trim();
  const message = normalizeNetworkContactMessage(formData.get("message"));
  if (!listingId) redirect("/network?error=contact");
  if (!message) redirect(`/network/listings/${listingId}/contact?error=message`);
  const { error } = await client.rpc("request_network_contact", { p_listing_id: listingId, p_message: message });
  if (error) {
    const reason = error.message.includes("sender_profile_required") ? "contact_profile"
      : error.message.includes("listing_unavailable") || error.message.includes("recipient_unavailable") ? "contact_unavailable"
      : error.message.includes("self_request") ? "contact_self" : "contact";
    redirect(`/network/listings/${listingId}/contact?error=${reason}`);
  }
  refreshContacts(listingId); redirect(`/network/listings/${listingId}?contact=sent`);
}

export async function respondNetworkContactAction(formData: FormData) {
  const { client } = await context(); const id = String(formData.get("id") ?? "").trim();
  const response = String(formData.get("response") ?? "");
  if (!id || (response !== "accepted" && response !== "declined")) redirect("/network/contacts?error=response");
  const { error } = await client.rpc("respond_network_contact", { p_request_id: id, p_response: response });
  if (error) redirect("/network/contacts?error=response");
  refreshContacts(); redirect(`/network/contacts?changed=${response}`);
}

export async function cancelNetworkContactAction(formData: FormData) {
  const { client } = await context(); const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/network/contacts?error=cancel");
  const { error } = await client.rpc("cancel_network_contact", { p_request_id: id });
  if (error) redirect("/network/contacts?error=cancel");
  refreshContacts(); redirect("/network/contacts?changed=canceled");
}

export async function sendNetworkMessageAction(formData: FormData) {
  const { client } = await context();
  const conversationId = String(formData.get("conversation_id") ?? "").trim();
  const body = normalizeNetworkMessageBody(formData.get("body"));
  if (!conversationId) redirect("/network/contacts?error=message");
  if (!body) redirect(`/network/messages/${conversationId}?error=message`);
  const { error } = await client.rpc("send_network_message", {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) redirect(`/network/messages/${conversationId}?error=${error.message.includes("interaction_blocked") ? "blocked" : "message"}`);
  refreshMessaging(conversationId);
  redirect(`/network/messages/${conversationId}?sent=1`);
}

export async function blockNetworkUserAction(formData: FormData) {
  const { client } = await context();
  const otherUserId = String(formData.get("other_user_id") ?? "").trim();
  const returnTo = safeNetworkRedirect(formData.get("return_to"));
  if (!otherUserId) redirect(`${returnTo}?error=safety`);
  const { error } = await client.rpc("block_network_user", { p_blocked_user_id: otherUserId });
  refreshMessaging();
  redirect(`${returnTo}?${error ? "error=safety" : "safety=blocked"}`);
}

export async function unblockNetworkUserAction(formData: FormData) {
  const { client } = await context();
  const otherUserId = String(formData.get("other_user_id") ?? "").trim();
  const returnTo = safeNetworkRedirect(formData.get("return_to"));
  if (!otherUserId) redirect(`${returnTo}?error=safety`);
  const { error } = await client.rpc("unblock_network_user", { p_blocked_user_id: otherUserId });
  refreshMessaging();
  redirect(`${returnTo}?${error ? "error=safety" : "safety=unblocked"}`);
}

export async function reportNetworkInteractionAction(formData: FormData) {
  const { client } = await context();
  const contactRequestId = String(formData.get("contact_request_id") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  const returnTo = safeNetworkRedirect(formData.get("return_to"));
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

export async function markNetworkConversationReadAction(conversationId: string) {
  const { client } = await context();
  const { error } = await client.rpc("mark_network_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (error) return { ok: false };
  refreshMessaging(conversationId);
  return { ok: true };
}
