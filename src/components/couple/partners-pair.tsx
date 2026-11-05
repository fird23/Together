import { UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Profile } from "@/types";

/** Два аватара внахлёст — как круги в логотипе. Если партнёра ещё нет, второе место пустое. */
export function PartnersPair({ me, partner, partnerName, compact = false }: { me: Profile; partner: Profile | null; partnerName?: string; compact?: boolean }) {
  const second = partner?.display_name ?? partnerName;
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        <Avatar name={me.display_name} src={me.avatar_url} size={compact ? "lg" : "xl"} className="ring-4 ring-paper" />
        <div className="-ml-6 sm:-ml-7">
          {second ? (
            <Avatar name={second} src={partner?.avatar_url} size={compact ? "lg" : "xl"} className="ring-4 ring-paper" />
          ) : (
            <span className={`${compact ? "size-20" : "size-28 sm:size-32"} grid place-items-center rounded-full border-2 border-dashed border-accent-300 bg-paper/70 text-accent-600 ring-4 ring-paper`}>
              <UserPlus className="size-8" aria-hidden />
            </span>
          )}
        </div>
      </div>
      <p className={`${compact ? "mt-3 text-base" : "mt-5 text-xl sm:text-2xl"} font-serif font-medium`}>
        {second ? `${me.display_name} и ${second}` : me.display_name}
      </p>
    </div>
  );
}
