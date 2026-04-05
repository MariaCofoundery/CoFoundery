export type LinkedInImportResult = {
  ok: false;
  reason: "not_implemented" | "invalid_url";
};

function isLikelyLinkedInUrl(url: string) {
  return /^https?:\/\/(www\.)?linkedin\.com\/.+/i.test(url.trim());
}

export async function importLinkedInProfile(url: string): Promise<LinkedInImportResult> {
  if (!isLikelyLinkedInUrl(url)) {
    return { ok: false, reason: "invalid_url" };
  }

  // TODO: Replace this stub with a real LinkedIn/CV import pipeline once product
  // requirements, consent handling and parsing rules are finalized.
  return { ok: false, reason: "not_implemented" };
}
