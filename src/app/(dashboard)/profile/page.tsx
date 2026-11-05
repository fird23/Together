import type { Metadata } from "next";
import { ProfileView } from "@/components/couple/profile-view";

export const metadata: Metadata = { title: "Профиль" };

export default function Page() {
  return <ProfileView />;
}
