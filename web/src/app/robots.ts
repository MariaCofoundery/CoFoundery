import type { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicAppOrigin();
  return {
    // "/network$" blocks only the member browse itself. Without the anchor the
    // prefix would also cover the public /network/p/ and /network/l/ pages.
    rules: { userAgent: "*", allow: ["/", "/network/p/", "/network/l/"], disallow: ["/api/", "/dashboard", "/account", "/advisor/", "/discovery", "/network$", "/network/contacts", "/network/messages", "/network/my", "/network/profile", "/network/listings/"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
