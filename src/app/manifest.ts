import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Together — пространство для двоих",
    short_name: "Together",
    description: "Приватное приложение для пар: общие дни, привычки, календарь и вишлисты.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F7F5EC",
    theme_color: "#F7F5EC",
    lang: "ru",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
