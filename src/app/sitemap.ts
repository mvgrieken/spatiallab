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
    ...publishedExperiments.map((e) => ({
      url: `${siteUrl}/how/${e.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${siteUrl}/stats`, changeFrequency: "daily", priority: 0.5 },
    { url: `${siteUrl}/where-it-fails`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
