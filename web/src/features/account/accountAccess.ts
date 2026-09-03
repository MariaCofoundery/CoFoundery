export type AccountAccessCapabilities = {
  hasFounder: boolean;
  hasAdvisor: boolean;
  hasNetwork: boolean;
};

export function canAccessAccountSettings(capabilities: AccountAccessCapabilities) {
  return capabilities.hasFounder || capabilities.hasAdvisor || capabilities.hasNetwork;
}
