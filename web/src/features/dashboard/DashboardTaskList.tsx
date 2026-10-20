import type { DashboardTaskKind } from "@/features/dashboard/founderDashboardTasks";

/**
 * Eine Aufgabe, wie sie die Startseite zeigt. Die Anzeige selbst ist seit dem
 * 20.10.2026 das Karussell in der Marken-Flaeche (`HeroCarousel`): der naechste
 * Schritt zuerst, danach hoechstens drei Aufgaben - eine Sache auf einmal.
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
