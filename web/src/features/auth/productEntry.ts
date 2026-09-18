export type ProductCapabilities = {
  hasFounder: boolean;
  hasAdvisor: boolean;
  hasConnect: boolean;
  hasConnectAccount?: boolean;
  connectProfileReady?: boolean;
  /**
   * Ob die Person den Einstieg schon durchlaufen hat.
   *
   * Voreinstellung true - "im Zweifel war sie schon da". Wer den Einstieg ein
   * zweites Mal bekommt, erlebt keine Einfuehrung, sondern eine Sperre; das
   * ist der teurere Fehler. Der echte Wert wird beim Aufruf uebergeben.
   */
  onboardingComplete?: boolean;
  coreProfileComplete: boolean;
};

export function resolveProductEntryPath(
  nextPath: string,
  capabilities: ProductCapabilities,
  welcomePath: string
) {
  const {
    hasFounder,
    hasAdvisor,
    hasConnect,
    hasConnectAccount = hasConnect,
    connectProfileReady = true,
    onboardingComplete = true,
    coreProfileComplete,
  } = capabilities;

  /**
   * Die erste Weiche, vor allen anderen: Wer noch nicht eingefuehrt wurde,
   * wird eingefuehrt - unabhaengig davon, welche Bereiche offen sind.
   *
   * Bis 18.09.2026 stand hier stattdessen `profileOnboardingAllowed`, das nur
   * dann wahr war, wenn /start eine Absicht mitgeschickt hatte. Die Absicht
   * fiel damit auf dem Anmeldeformular, neben dem Beta-Code, bevor irgendwer
   * etwas gesehen hatte - und wer ohne Absicht ankam, wurde auf /start
   * zurueckgeschickt. Menschen ohne Produktrolle sahen den Einstieg nie.
   */
  if (!onboardingComplete) return welcomePath;

  if (!hasFounder && !hasAdvisor && hasConnect) {
    if (nextPath === "/account") return nextPath;
    if (!connectProfileReady) {
      return nextPath.startsWith("/connect/l/")
        ? `/connect/profile?next=${encodeURIComponent(nextPath)}`
        : "/connect/profile";
    }
    return nextPath.startsWith("/connect") ? nextPath : "/connect";
  }
  if (!hasFounder && !hasAdvisor && hasConnectAccount) return "/account";
  // Letzter Ausweg: eingefuehrt, aber ohne jeden Bereich. Sollte nach dem
  // Einstieg nicht vorkommen - dort waehlt man mindestens einen.
  if (!hasFounder && !hasAdvisor) return "/start";
  if (!coreProfileComplete) return welcomePath;
  if (nextPath === "/dashboard" && !hasFounder && hasAdvisor) return "/advisor/dashboard";
  return nextPath;
}
