export type ProductCapabilities = {
  hasFounder: boolean;
  hasAdvisor: boolean;
  hasNetwork: boolean;
  coreProfileComplete: boolean;
};

export function resolveProductEntryPath(
  nextPath: string,
  capabilities: ProductCapabilities,
  welcomePath: string
) {
  const { hasFounder, hasAdvisor, hasNetwork, coreProfileComplete } = capabilities;
  if (!hasFounder && !hasAdvisor && hasNetwork) {
    return nextPath.startsWith("/network") ? nextPath : "/network";
  }
  if (!coreProfileComplete) return welcomePath;
  if (!hasFounder && !hasAdvisor) return "/start";
  if (nextPath === "/dashboard" && !hasFounder && hasAdvisor) return "/advisor/dashboard";
  return nextPath;
}
