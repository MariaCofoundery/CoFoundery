import type { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicAppOrigin();
  return {
    // "/connect$" blocks only the member browse itself. Without the anchor the
    // prefix would also cover the public /connect/p/ and /connect/l/ pages.
    rules: { userAgent: "*", allow: ["/", "/connect/p/", "/connect/l/"], disallow: ["/api/", "/dashboard", "/account", "/advisor/", "/discovery", "/profile", "/connect$", "/connect/contacts", "/connect/messages", "/connect/my", "/connect/profile", "/connect/listings/"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
