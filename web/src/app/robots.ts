import type { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicAppOrigin();
  return {
    rules: { userAgent: "*", allow: ["/", "/network/p/", "/network/l/"], disallow: ["/api/", "/dashboard", "/account", "/advisor/", "/discovery", "/network/contacts", "/network/messages", "/network/my", "/network/profile", "/network/listings/"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
