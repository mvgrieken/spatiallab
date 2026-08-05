import type { MetadataRoute } from "next";

import { publishedExperiments } from "@/lib/experiments";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    ...publishedExperiments.map((e) => ({
      url: `${siteUrl}/experiments/${e.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
