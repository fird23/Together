"use client";

import { useState, type FormEvent } from "react";
import type { z } from "zod";
import { firstErrors } from "@/lib/validation";
import { GENERIC_ERROR } from "@/lib/errors";

/**
 * Проверяет форму по схеме Zod, показывает ошибки по полям,
 * затем выполняет действие и ловит его ошибки.
 */
export function useValidatedForm<T>(schema: z.ZodType<T>, action: (data: T) => Promise<void>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const result = schema.safeParse(raw);
    setFormError(null);
    if (!result.success) {
      setErrors(firstErrors(result.error));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await action(result.data);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  }

  return { errors, formError, pending, handleSubmit, setFormError };
}
