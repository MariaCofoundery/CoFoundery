"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { parseNetworkListing, parseNetworkProfile, listingPublishable, profilePublishable } from "./networkValidation";

async function context() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login?next=/network");
  const { data: eligible } = await client.rpc("is_network_member");
  if (!eligible) redirect("/dashboard");
  return { client, user };
}
function refresh() { ["/network", "/network/my", "/network/profile", "/dashboard"].forEach((path) => revalidatePath(path)); }

export async function saveNetworkProfileAction(formData: FormData) {
  const { client, user } = await context(); const values = parseNetworkProfile(formData);
  const publish = formData.get("intent") === "publish";
  if (publish && !profilePublishable(values)) redirect("/network/profile?error=incomplete");
  const { error } = await client.from("network_profiles").upsert({
    user_id: user.id, ...values, status: publish ? "active" : "draft",
    published_at: publish ? new Date().toISOString() : null,
  }, { onConflict: "user_id" });
  if (error) redirect("/network/profile?error=save");
  refresh(); redirect(`/network/profile?saved=${publish ? "published" : "draft"}`);
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
  const { client, user } = await context(); const values = parseNetworkListing(formData);
  const id = String(formData.get("id") ?? "").trim(); const publish = formData.get("intent") === "publish";
  if (publish && !listingPublishable(values)) redirect(`/network/listings/${id || "new"}/edit?error=incomplete`);
  const payload = { owner_user_id: user.id, ...values, status: publish ? "active" : "draft",
    published_at: publish ? new Date().toISOString() : null,
    expires_at: publish ? new Date(Date.now() + 60 * 86400000).toISOString() : null };
  const result = id
    ? await client.from("network_listings").update(payload).eq("id", id).eq("owner_user_id", user.id).select("id").single()
    : await client.from("network_listings").insert(payload).select("id").single();
  if (result.error) redirect(`/network/my?error=${result.error.message.includes("active_network_profile_required") ? "profile" : "save"}`);
  refresh(); redirect(`/network/listings/${result.data.id}`);
}

export async function changeNetworkListingStatusAction(formData: FormData) {
  const { client, user } = await context(); const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const updates: Record<string, string | null> = intent === "pause" ? { status: "paused" }
    : intent === "complete" ? { status: "completed" }
    : intent === "renew" ? { status: "active", published_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60 * 86400000).toISOString() }
    : intent === "publish" ? { status: "active", published_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60 * 86400000).toISOString() }
    : {};
  if (Object.keys(updates).length) await client.from("network_listings").update(updates).eq("id", id).eq("owner_user_id", user.id);
  refresh(); redirect("/network/my");
}
