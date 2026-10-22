import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The task screens are behind a login and hold internal data — only the public pages are crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/$", "/login", "/accessibility"], disallow: ["/manager", "/staff", "/api"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
