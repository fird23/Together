import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      <Skeleton className="mt-7 h-[460px] w-full rounded-hero" />
    </div>
  );
}
