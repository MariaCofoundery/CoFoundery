"use server";

import { revalidatePath } from "next/cache";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";
import {
  saveDiscoveryProfile,
  unsaveDiscoveryProfile,
} from "@/features/discovery/discoverySavesData";
import { createClient } from "@/lib/supabase/server";

async function requireFounder() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !(await hasFounderDiscoveryAccess(user.id, supabase))) {
    throw new Error("discovery_save_forbidden");
  }
  return { supabase, userId: user.id };
}

function revalidateDiscoverySave(profileId: string) {
  revalidatePath("/discovery");
  revalidatePath("/discovery/saved");
  revalidatePath(`/discovery/${profileId}`);
}

export async function saveFounderDiscoveryProfileAction(profileId: string) {
  const { supabase, userId } = await requireFounder();
  await saveDiscoveryProfile(userId, profileId, supabase);
  revalidateDiscoverySave(profileId);
}

export async function unsaveFounderDiscoveryProfileAction(profileId: string) {
  const { supabase, userId } = await requireFounder();
  await unsaveDiscoveryProfile(userId, profileId, supabase);
  revalidateDiscoverySave(profileId);
}
