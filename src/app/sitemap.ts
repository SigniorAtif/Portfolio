import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/work`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.6 },
  ];
}
