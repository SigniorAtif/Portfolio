import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/** One page for now. Project pages and About join when they exist. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: site.url, changeFrequency: "monthly", priority: 1 }];
}
