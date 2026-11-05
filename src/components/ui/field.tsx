"use client";

import { useId, useState } from "react";
import { AlertCircle, Eye, EyeOff, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

type FieldProps = Omit<React.ComponentProps<"input">, "size"> & {
  label: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  trailing?: React.ReactNode;
};

export function TextField({ label, hint, error, icon: Icon, trailing, className, id, ...props }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const messageId = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-control bg-paper px-3.5 ring-1 transition-shadow focus-within:ring-2",
          error ? "ring-danger focus-within:ring-danger" : "ring-sand-300 focus-within:ring-accent-600",
          props.disabled && "bg-sand-100",
        )}
      >
        {Icon && <Icon className="size-[18px] shrink-0 text-ink-faint" aria-hidden />}
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:text-ink-soft"
          {...props}
        />
        {trailing}
      </div>
      {error ? (
        <p id={messageId} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, "type" | "icon" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      icon={Lock}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
          aria-pressed={visible}
          className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-sand-100 hover:text-ink"
        >
          {visible ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      }
    />
  );
}
