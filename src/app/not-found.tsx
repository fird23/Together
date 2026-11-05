import { Compass } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-milk px-5">
      <div className="flex flex-col items-center">
        <Logo className="mb-10" />
        <EmptyState
          icon={Compass}
          title="Такой страницы нет"
          description="Возможно, ссылка устарела или в ней опечатка."
          action={<ButtonLink href="/">На главную</ButtonLink>}
        />
      </div>
    </div>
  );
}
