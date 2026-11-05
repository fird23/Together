"use client";

import { useState } from "react";
import { CalendarDays, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { createCoupleSchema } from "@/lib/validation";
import { updateStartDate } from "@/services/couple";
import { todayISO } from "@/utils/days";
import type { Couple } from "@/types";

export function EditStartDate({ couple }: { couple: Couple }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" aria-hidden /> Изменить дату
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Дата начала отношений"
        description="Счётчик дней пересчитается сразу, и партнёр увидит новую дату."
      >
        <EditForm couple={couple} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

// Форма живёт внутри диалога и сбрасывается при каждом открытии.
function EditForm({ couple, onDone }: { couple: Couple; onDone: () => void }) {
  const { refresh } = useWorkspace();
  const { errors, formError, pending, handleSubmit } = useValidatedForm(createCoupleSchema, async (data) => {
    await updateStartDate(couple.id, data.startDate);
    await refresh();
    onDone();
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <TextField
        name="startDate"
        type="date"
        label="Дата"
        icon={CalendarDays}
        defaultValue={couple.start_date}
        max={todayISO()}
        min="1950-01-01"
        error={errors.startDate}
        disabled={pending}
      />
      {formError && <Alert tone="error">{formError}</Alert>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          Отмена
        </Button>
        <Button type="submit" loading={pending}>
          Сохранить
        </Button>
      </div>
    </form>
  );
}
