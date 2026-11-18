import type { MetadataRoute } from "next";

/** Приложение приватное: просим поисковики ничего не индексировать. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
