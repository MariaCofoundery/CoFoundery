export type AccountAccessCapabilities = {
  hasFounder: boolean;
  hasAdvisor: boolean;
  hasConnect: boolean;
};

export function canAccessAccountSettings(capabilities: AccountAccessCapabilities) {
  return capabilities.hasFounder || capabilities.hasAdvisor || capabilities.hasConnect;
}
