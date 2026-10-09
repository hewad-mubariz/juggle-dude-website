import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.url) return [];
  return ["/", "/support/", "/terms/", ...(site.privacyApproved ? ["/privacy/"] : [])].map(path => ({ url: new URL(path, site.url!).toString() }));
}
