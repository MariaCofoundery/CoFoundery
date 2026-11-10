/** Partnerliste (20270415120000): Arten und Stand. Kein Verlauf, keine Bewertung, keine Rangfolge. */
export const CONTACT_KINDS = ["partner", "investor", "speaker", "mentor", "other"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];
export const CONTACT_STATUSES = ["asked", "talking", "committed", "active", "paused"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export type OrgContact = {
  id: string; name: string; kinds: ContactKind[]; company: string | null; email: string | null; phone: string | null; url: string | null;
  notes: string | null; status: ContactStatus; ownerUserId: string | null;
};
export type ContactEventLink = { contactId: string; eventId: string; role: string | null };

export const isContactKind = (value: unknown): value is ContactKind => (CONTACT_KINDS as readonly unknown[]).includes(value);
export const isContactStatus = (value: unknown): value is ContactStatus => (CONTACT_STATUSES as readonly unknown[]).includes(value);

export function contactOf(row: Record<string, unknown>): OrgContact {
  return {
    id: row.id as string,
    name: row.name as string,
    kinds: (Array.isArray(row.kinds) ? row.kinds : []).filter(isContactKind),
    company: (row.company as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: isContactStatus(row.status) ? row.status : "asked",
    ownerUserId: (row.owner_user_id as string | null) ?? null,
  };
}

/** Filter und Suche: Art, Stichwort in Name, Firma oder Notiz. */
export function filterContacts(contacts: OrgContact[], kind: ContactKind | null, q: string): OrgContact[] {
  const needle = q.trim().toLocaleLowerCase("de");
  return contacts
    .filter((contact) => !kind || contact.kinds.includes(kind))
    .filter((contact) => !needle || `${contact.name} ${contact.company ?? ""} ${contact.notes ?? ""}`.toLocaleLowerCase("de").includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export const cleanHttps = (value: string): string | null => (/^https:\/\/[^\s]+$/.test(value.trim()) && value.trim().length <= 300 ? value.trim() : null);
