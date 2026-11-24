import { isWorkspacePath } from "@/features/navigation/workspace/workspaceNav";

/**
 * Welches Menue-Geruest ProductShell zeichnet. Reine Darstellung: jede Seite prueft ihren Zugang selbst.
 *
 * - "workspace": Advisor-Seitenleiste (Entwurf 05.11.2026), nur in der Advisor-Ansicht auf Arbeitsbereichs-Seiten.
 * - "founder":   die Founder-Leiste; auch fuer reine Connect-Konten.
 * - "classic":   die aeltere Kopfleiste. Sie bleibt fuer alles uebrige, vor allem die Advisor-Ansicht auf Seiten
 *                ausserhalb des Arbeitsbereichs (/connect, /me/profile, /teams ...) und gesperrte Connect-Konten.
 *
 * Die Entscheidung stand als zwei Bedingungen mitten in der Komponente; hier steht sie einmal, mit Test.
 */
export type ChromeKind = "workspace" | "founder" | "classic";

export type ChromeInput = {
  hasFounder: boolean;
  hasAdvisor: boolean;
  /** Connect-Zugang aktiv (hasConnect). */
  hasConnect: boolean;
  /** Connect-Konto vorhanden, aber gesperrt/ohne Zugang (hasConnectAccount). */
  hasConnectAccount: boolean;
  activeView: "founder" | "advisor";
  pathname: string;
};

export function chooseChrome(input: ChromeInput): ChromeKind {
  const { hasFounder, hasAdvisor, hasConnect, hasConnectAccount, activeView, pathname } = input;
  const isConnectOnly = hasConnect && !hasFounder && !hasAdvisor;
  const isSuspendedConnectOnly = hasConnectAccount && !hasConnect && !hasFounder && !hasAdvisor;
  const isFounderView = activeView === "founder";

  const useWorkspace =
    hasAdvisor && activeView === "advisor" && !isConnectOnly && !isSuspendedConnectOnly && isWorkspacePath(pathname);
  if (useWorkspace) return "workspace";

  const useFounderShell = !isSuspendedConnectOnly && (isConnectOnly || (isFounderView && hasFounder));
  if (useFounderShell) return "founder";

  return "classic";
}
