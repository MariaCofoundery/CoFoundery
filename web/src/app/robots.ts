import type { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicAppOrigin();
  return {
    // Closed beta: public slug routes also require membership.
    rules: { userAgent: "*", allow: ["/"], disallow: ["/connect","/admin/problem-radar", "/connect/workspaces", "/team-intake", "/api/", "/dashboard", "/account", "/advisor/", "/discovery", "/profile", "/connect$", "/connect/contacts", "/connect/messages", "/connect/my", "/connect/profile", "/connect/listings/", "/connect/problems", "/connect/people", "/connect/ventures", "/connect/searches", "/connect/suggestions"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
