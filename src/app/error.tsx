"use client";

import { TriangleAlert } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-milk px-5">
      <div className="flex flex-col items-center">
        <Logo className="mb-10" />
        <EmptyState
          icon={TriangleAlert}
          tone="error"
          title="Что-то пошло не так"
          description="Мы не смогли показать эту страницу. Попробуйте ещё раз."
          action={
            <>
              <Button onClick={reset}>Попробовать снова</Button>
              <ButtonLink href="/" variant="secondary">
                На главную
              </ButtonLink>
            </>
          }
        />
      </div>
    </div>
  );
}
