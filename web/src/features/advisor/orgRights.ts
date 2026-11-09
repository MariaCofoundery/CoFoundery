/**
 * Rollen und Rechte der Organisation - das Spiegelbild von `org_right_preset` / `org_role_allows` in der Datenbank
 * (Migration 20270410120000). Die DATENBANK entscheidet; dieses Modul sagt der Oberflaeche nur, was sie anzeigen darf.
 * Ein Test haelt beide Seiten gleich.
 *
 * Admin heisst technisch weiter `owner` (alte Daten, Schluessel, Einladungen).
 */
export const ORG_ROLES = ["owner", "coordinator", "advisor", "guest"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_RIGHTS = ["invite", "plan", "teams", "people", "room", "results", "profile"] as const;
export type OrgRight = (typeof ORG_RIGHTS)[number];
export type OrgRights = Record<OrgRight, boolean>;
/** Was bei einer Person von der Voreinstellung der Rolle abweicht. */
export type OrgRightOverrides = Partial<Record<OrgRight, boolean>>;

const PRESET: Record<OrgRole, readonly OrgRight[]> = {
  owner: ORG_RIGHTS,
  coordinator: ORG_RIGHTS,
  advisor: ["people", "room", "results"],
  guest: ["results"],
};

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (ORG_ROLES as readonly string[]).includes(value);
}

export function orgRoleOf(value: unknown): OrgRole {
  return isOrgRole(value) ? value : "advisor";
}

/** Darf diese Rolle das Recht ueberhaupt haben? Ein Gast hoechstens `results`. */
export function roleAllows(role: OrgRole, right: OrgRight): boolean {
  return role !== "guest" || right === "results";
}

export function rightPreset(role: OrgRole, right: OrgRight): boolean {
  return PRESET[role].includes(right);
}

/** Die Rechte einer Person: Voreinstellung der Rolle, darueber ihre einzeln gesetzten Rechte. Admins haben immer alles. */
export function rightsOf(role: OrgRole, overrides?: OrgRightOverrides | null): OrgRights {
  const result = {} as OrgRights;
  for (const right of ORG_RIGHTS) {
    if (role === "owner") result[right] = true;
    else if (!roleAllows(role, right)) result[right] = false;
    else result[right] = typeof overrides?.[right] === "boolean" ? (overrides[right] as boolean) : rightPreset(role, right);
  }
  return result;
}

/** Nur die Rechte, die wirklich von der Voreinstellung abweichen - so speichert es die Datenbank. */
export function overridesOf(role: OrgRole, wanted: Partial<Record<OrgRight, boolean>>): OrgRightOverrides {
  const result: OrgRightOverrides = {};
  for (const right of ORG_RIGHTS) {
    const value = wanted[right];
    if (typeof value === "boolean" && roleAllows(role, right) && value !== rightPreset(role, right)) result[right] = value;
  }
  return result;
}

/** Liest die gespeicherten Abweichungen defensiv: unbekannte Schluessel und Nicht-Wahrheitswerte zaehlen nicht. */
export function parseOverrides(value: unknown): OrgRightOverrides {
  const result: OrgRightOverrides = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const right of ORG_RIGHTS) {
      const entry = (value as Record<string, unknown>)[right];
      if (typeof entry === "boolean") result[right] = entry;
    }
  }
  return result;
}

/** Admin oder Koordination: sieht alle Startups der Organisation (`is_advisor_org_lead_of`). */
export function isLeadRole(role: OrgRole | null | undefined): boolean {
  return role === "owner" || role === "coordinator";
}

export function isAdminRole(role: OrgRole | null | undefined): boolean {
  return role === "owner";
}

/** Rollen, die man per Einladung vergeben kann: Admins ernennt nur ein Admin. */
export function invitableRoles(asAdmin: boolean): OrgRole[] {
  return asAdmin ? ["coordinator", "advisor", "guest", "owner"] : ["coordinator", "advisor", "guest"];
}
