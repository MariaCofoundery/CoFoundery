import type { DashboardTaskKind } from "@/features/dashboard/founderDashboardTasks";

/**
 * Eine Aufgabe, wie sie die Startseite zeigt. Seit dem 04.11.2026 stehen
 * Aufgaben als Karten unter "Wartet auf dich" (`DashboardWaiting`) bzw. in der
 * Zeile "Laeuft gerade" - der naechste Schritt steht getrennt darueber.
 */
export type DashboardTaskPresentation = {
  id: string;
  kind: DashboardTaskKind;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  action: string;
};
