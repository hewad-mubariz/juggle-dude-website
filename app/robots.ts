import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const disallow = [...(site.privacyApproved ? [] : ["/privacy/"]), ...(site.operatorDetailsReady ? [] : ["/terms/", "/imprint/"])];
  return { rules: { userAgent: "*", allow: "/", ...(disallow.length ? { disallow } : {}) }, ...(site.url ? { sitemap: new URL("sitemap.xml", site.url).toString() } : {}) };
}
