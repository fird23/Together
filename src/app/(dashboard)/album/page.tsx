import type { Metadata } from "next";
import { AlbumView } from "@/components/album/album-view";

export const metadata: Metadata = { title: "Фотоальбом" };

export default function Page() {
  return <AlbumView />;
}
