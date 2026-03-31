const AVATAR_IDS = [
  "avatar-01",
  "avatar-02",
  "avatar-03",
  "avatar-04",
  "avatar-05",
  "avatar-06",
  "avatar-07",
  "avatar-08",
  "avatar-09",
  "avatar-10",
  "avatar-11",
  "avatar-12",
  "avatar-13",
  "avatar-14",
  "avatar-15",
  "avatar-16",
  "avatar-17",
  "avatar-18",
  "avatar-19",
  "avatar-20",
  "avatar-21",
  "avatar-22",
  "avatar-23",
  "avatar-24",
  "avatar-25",
  "avatar-26",
  "avatar-27",
  "avatar-28",
  "avatar-29",
  "avatar-30",
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export const AVATAR_LIBRARY = AVATAR_IDS.map((id, index) => ({
  id,
  label: `Avatar ${String(index + 1).padStart(2, "0")}`,
  src: `/avatars/library/${id}.png`,
})) as ReadonlyArray<{
  id: AvatarId;
  label: string;
  src: string;
}>;

const AVATAR_ID_SET = new Set<string>(AVATAR_IDS);

export function isAvatarId(value: string | null | undefined): value is AvatarId {
  return typeof value === "string" && AVATAR_ID_SET.has(value.trim());
}

export function normalizeAvatarId(value: string | null | undefined): AvatarId | null {
  const normalized = value?.trim() ?? "";
  return isAvatarId(normalized) ? normalized : null;
}

export function getAvatarSrc(value: string | null | undefined): string | null {
  const avatarId = normalizeAvatarId(value);
  if (!avatarId) return null;
  return `/avatars/library/${avatarId}.png`;
}
