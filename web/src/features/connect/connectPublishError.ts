export function connectPublishError(message: string) {
  if (message.includes("listing_title_required")) return "publish_title";
  if (message.includes("listing_summary_required") || message.includes("network_listings_active_complete_check")) return "publish_summary";
  if (message.includes("active_network_profile_required")) return "publish_profile";
  if (message.includes("lifecycle_conflict")) return "publish_conflict";
  if (message.includes("membership") || message.includes("member_required") || message.includes("lifecycle_forbidden")) return "publish_membership";
  return "save";
}
