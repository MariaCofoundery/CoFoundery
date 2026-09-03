import { buildDiscoveryV2Candidate } from "@/features/discovery/discoveryV2Search";
import { normalizeMustHaves } from "@/features/discovery/discoveryValidation";
import type { DiscoveryCandidate, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";

export type DiscoverySaveReference = {
  saved_profile_id: string;
  created_at: string;
};

export type SavedDiscoveryCandidate = {
  candidate: DiscoveryCandidate;
  savedAt: string;
};

export function projectVisibleSavedDiscoveryCandidates(
  savesNewestFirst: DiscoverySaveReference[],
  visibleActiveProfiles: FounderDiscoveryProfile[]
): SavedDiscoveryCandidate[] {
  const profilesById = new Map(visibleActiveProfiles.map((profile) => [profile.id, profile]));
  return savesNewestFirst.flatMap((save) => {
    const profile = profilesById.get(save.saved_profile_id);
    return profile
      ? [{
          candidate: buildDiscoveryV2Candidate(profile, normalizeMustHaves(null)),
          savedAt: save.created_at,
        }]
      : [];
  });
}
