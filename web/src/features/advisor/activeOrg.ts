/**
 * Das Programm, in dem man gerade arbeitet (06.11.2026): wer in zwei Accelerator-Programmen Mitglied ist, soll nicht
 * zwischen ihnen hin- und herspringen. Die Wahl steht in einem Sitzungs-Cookie (reine Darstellung wie der Arbeits-
 * kontext, kein Zugang): Seiten ohne ?org= nehmen dieses Programm, die Seitenleiste zeigt es farbig an, und Listen
 * zeigen nur seine Teams, Aufgaben und Termine. Jede Seite prueft ihren Zugang weiter selbst.
 */
export const ACTIVE_ORG_COOKIE = "ui_active_org";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const parseActiveOrg = (value: string | null | undefined) => (value && UUID.test(value) ? value : null);

/** Die gewaehlte Organisation nach vorn; ist sie nicht (mehr) dabei, bleibt die Reihenfolge. */
export function activeFirst<T extends { id: string }>(orgs: T[], activeId: string | null): T[] {
  const active = orgs.find((org) => org.id === activeId);
  return active ? [active, ...orgs.filter((org) => org !== active)] : orgs;
}

/** Je Programm eine Farbe: Punkt in der Seitenleiste und Rand der Kopfleiste. Nach Position in der festen Namensreihenfolge. */
export const ORG_COLORS = [
  { dot: "#6D49E0", soft: "#EEE9FF", text: "#3B1F99" },
  { dot: "#0A80B8", soft: "#E0F2FB", text: "#075A82" },
  { dot: "#D98A0B", soft: "#FFF1D6", text: "#7A4300" },
  { dot: "#1F7A4D", soft: "#E3F4EA", text: "#135C3B" },
] as const;
export const orgColor = (index: number) => ORG_COLORS[Math.max(0, index) % ORG_COLORS.length];
