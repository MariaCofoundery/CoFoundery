import "server-only";

import { hasProfileRole } from "@/features/profile/profileRoles";
import { getProfileBasicsRow } from "@/features/profile/profileData";

type ProfileClient = Parameters<typeof getProfileBasicsRow>[0];

export async function hasFounderDiscoveryAccess(userId: string, client: ProfileClient) {
  const profile = await getProfileBasicsRow(client, userId).catch(() => null);
  return profile != null && hasProfileRole(profile.roles, "founder");
}
