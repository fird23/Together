import { NextResponse } from "next/server";
import { iconFile, isIconId } from "@/lib/app-icons";

/** Манифест сайта с иконкой выбранного варианта (для установки на экран «Домой» с другой иконкой). */
export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  if (!isIconId(variant)) return NextResponse.json({ error: "unknown variant" }, { status: 404 });
  return NextResponse.json(
    {
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
        { src: iconFile(variant, "icon-192.png"), sizes: "192x192", type: "image/png" },
        { src: iconFile(variant, "icon-512.png"), sizes: "512x512", type: "image/png" },
        { src: iconFile(variant, "icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
