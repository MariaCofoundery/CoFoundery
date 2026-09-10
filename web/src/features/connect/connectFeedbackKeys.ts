/**
 * Die Rueckmeldungen, die Connect-Seiten ueber die URL setzen duerfen.
 *
 * Eine Liste je Namensraum, damit jede Seite nur annimmt, was sie auch
 * anzeigen kann - siehe `knownKey`. Muessen mit den
 * connect.json-Dateien unter messages/ uebereinstimmen; ein Test vergleicht beide Richtungen.
 */

export const CONNECT_ERROR_KEYS = [
  "identity_incomplete",
  "roles_missing",
  "incomplete",
  "public_confirmation",
  "photo_reuse",
  "photo_upload",
  "profile",
  "too_many_topics",
  "too_many_industries",
  "too_many_locations",
  "invalid_dates",
  "message",
  "contact",
  "contact_profile",
  "contact_self",
  "contact_unavailable",
  "save",
] as const;

/** success.profile.* und success.listing.* teilen dieselben zwei Zustaende. */
export const CONNECT_PUBLICATION_KEYS = ["draft", "published"] as const;

export const CONNECT_LIFECYCLE_KEYS = ["publish", "pause", "renew", "complete"] as const;

export const CONNECT_CONTACT_KEYS = ["accepted", "declined", "canceled"] as const;

export const CONNECT_SAFETY_KEYS = ["blocked", "unblocked", "reported"] as const;
