/** Saving an existing object never changes its publication lifecycle. */
export function savedPublicationStatus(
  current: string | null | undefined,
  publish: boolean,
) {
  if (current && current !== "draft") return current;
  return publish ? "active" : "draft";
}
