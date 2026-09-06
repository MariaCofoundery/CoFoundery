export type ProductCapabilities = {
  hasFounder: boolean;
  hasAdvisor: boolean;
  hasConnect: boolean;
  hasConnectAccount?: boolean;
  connectProfileReady?: boolean;
  profileOnboardingAllowed?: boolean;
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
    profileOnboardingAllowed = false,
    coreProfileComplete,
  } = capabilities;
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
  if (!coreProfileComplete && (hasFounder || hasAdvisor || profileOnboardingAllowed)) return welcomePath;
  if (!hasFounder && !hasAdvisor) return "/start";
  if (!coreProfileComplete) return welcomePath;
  if (nextPath === "/dashboard" && !hasFounder && hasAdvisor) return "/advisor/dashboard";
  return nextPath;
}
