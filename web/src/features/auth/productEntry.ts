export type ProductCapabilities = {
  hasFounder: boolean;
  hasAdvisor: boolean;
  hasNetwork: boolean;
  hasNetworkAccount?: boolean;
  networkProfileReady?: boolean;
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
    hasNetwork,
    hasNetworkAccount = hasNetwork,
    networkProfileReady = true,
    profileOnboardingAllowed = false,
    coreProfileComplete,
  } = capabilities;
  if (!hasFounder && !hasAdvisor && hasNetwork) {
    if (nextPath === "/account") return nextPath;
    if (!networkProfileReady) return "/network/profile";
    return nextPath.startsWith("/network") ? nextPath : "/network";
  }
  if (!hasFounder && !hasAdvisor && hasNetworkAccount) return "/account";
  if (!coreProfileComplete && (hasFounder || hasAdvisor || profileOnboardingAllowed)) return welcomePath;
  if (!hasFounder && !hasAdvisor) return "/start";
  if (!coreProfileComplete) return welcomePath;
  if (nextPath === "/dashboard" && !hasFounder && hasAdvisor) return "/advisor/dashboard";
  return nextPath;
}
