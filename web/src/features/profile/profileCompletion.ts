import { normalizeProfileRoles, profileRoleLabel, type ProfileRole } from "@/features/profile/profileRoles";
import type { ProfileBasicsRow } from "@/features/profile/profileData";

/**
 * Ob die vier Kernangaben da sind - eine Weiche, kein Fortschrittswert.
 *
 * Hier stand bis 10.09.2026 zusaetzlich ein Prozentwert (`computeProfileCompletion`)
 * mit Punktgewichten je Feld: Kernangaben 40, Headline 10, Erfahrung 20,
 * Skills 20, LinkedIn-URL 5, LinkedIn-Import 5. Er ist entfernt, aus drei
 * Gruenden:
 *
 *   Die Gewichte waren frei gewaehlt. Aus nichts abgeleitet, also sagt
 *   "68 % Profil" der Person nichts Wahres.
 *
 *   Die letzten fuenf Punkte belohnten eine Plattformhandlung - dass jemand
 *   den LinkedIn-Import ausgefuehrt hat -, keine Eigenschaft des Menschen.
 *
 *   Er war schon aus der Oberflaeche entfernt und damit toter Code; ein Test
 *   im Dashboard hielt lediglich fest, dass er dort nicht mehr auftaucht.
 *
 * Kein Ersatz durch einen "besseren" Vollstaendigkeitswert: Wie vollstaendig
 * ein Formular ausgefuellt ist, ist kein Konstrukt, zu dem es etwas zu messen
 * gibt. Was gemessen und verglichen werden kann, steht im Capability-Modell -
 * siehe docs/capability-comparison-theory-brief.md.
 */

export type ProfileCoreModel = {
  name: string | null;
  role: ProfileRole | null;
  focus: string | null;
  intention: string | null;
  avatarId: string | null;
};

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function buildProfileCore(profile: ProfileBasicsRow | null): ProfileCoreModel {
  const roles = normalizeProfileRoles(profile?.roles ?? null);
  return {
    name: normalizeText(profile?.display_name),
    role: roles[0] ?? null,
    focus: normalizeText(profile?.focus_skill),
    intention: normalizeText(profile?.intention),
    avatarId: normalizeText(profile?.avatar_id),
  };
}

/**
 * Steuert das Routing nach der Anmeldung. Vier Angaben, alle vier noetig -
 * bewusst hart und ohne Abstufung, weil eine Weiche keine Zwischenstufe hat.
 */
export function isCoreProfileComplete(profile: ProfileBasicsRow | null) {
  const core = buildProfileCore(profile);
  return Boolean(core.name && core.role && core.focus && core.intention);
}

export function getPrimaryProfileRoleLabel(profile: ProfileBasicsRow | null) {
  const role = buildProfileCore(profile).role;
  return role ? profileRoleLabel(role) : "–";
}
