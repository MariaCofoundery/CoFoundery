/** Closed beta. Not an env toggle: reopening requires a new explicit consent contract. */
export const CONNECT_PUBLIC_ROLLOUT_ENABLED: boolean = false;
export function connectPublicationVisibility(value: FormDataEntryValue | null) {
  return CONNECT_PUBLIC_ROLLOUT_ENABLED && value === "public" ? "public" : "members_only";
}
