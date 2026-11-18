"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { DueDateButton } from "@/components/todos/due-date-button";
import { cn } from "@/utils/cn";
import { parseTodoTitle, type Subtask } from "@/utils/todo-title";
import type { EventColor, Todo } from "@/types";

export type Who = "both" | "me" | "partner";

export function EditForm({ todo, who: initialWho, partnerName, hasPartner, onCancel, onSave }: {
  todo: Todo; who: Who; partnerName: string; hasPartner: boolean; onCancel: () => void; onSave: (v: { title: string; comment: string; subtasks: Subtask[]; who: Who; due: string; color: EventColor | null }) => Promise<void>;
}) {
  const initialData = parseTodoTitle(todo.title);
  const [title, setTitle] = useState(initialData.cleanTitle);
  const [comment, setComment] = useState(initialData.comment);
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialData.subtasks);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  
  const [who, setWho] = useState<Who>(initialWho);
  const [due, setDue] = useState(todo.due_day ?? "");
  const [color, setColor] = useState<EventColor | null>(todo.color ?? null);
  const [pending, setPending] = useState(false);

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), done: false }]);
    setNewSubtaskTitle("");
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  return (
    <form className="space-y-4" onSubmit={async (e) => { 
      e.preventDefault(); 
      if (!title.trim()) return; 
      setPending(true); 
      const fullSubtasks = [...subtasks];
      if (newSubtaskTitle.trim()) {
        fullSubtasks.push({ id: Date.now().toString(), title: newSubtaskTitle.trim(), done: false });
      }
      await onSave({ title, comment, subtasks: fullSubtasks, who, due, color }); 
    }}>
      <div>
        <label className="text-xs font-medium text-ink-soft mb-1 block">Название дела</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Название дела" className="hb-input" autoFocus />
      </div>

      <div>
        <label className="text-xs font-medium text-ink-soft mb-1 block">Комментарий</label>
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Добавьте пояснение к делу…" className="hb-input text-xs" />
      </div>

      <div>
        <label className="text-xs font-medium text-ink-soft mb-1 block">Подпункты</label>
        <div className="space-y-2 mb-2">
          {subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-2 text-xs bg-sand-50 px-2.5 py-1.5 rounded-lg">
              <span className="flex-1 font-medium">{st.title}</span>
              <button type="button" onClick={() => removeSubtask(st.id)} className="text-ink-faint hover:text-danger">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
            placeholder="Добавить подпункт…"
            className="hb-input flex-1 text-xs"
          />
          <button type="button" onClick={addSubtask} className="hb-button text-xs px-3 py-1 bg-secondary">
            Добавить
          </button>
        </div>
      </div>

      <div className="hb-segment mt-0!" role="radiogroup" aria-label="Для кого дело">
        {([["both", "Вместе"], ["me", "Я"], ...(hasPartner ? [["partner", partnerName]] : [])] as [Who, string][]).map(([id, label]) => (
          <button type="button" key={id} role="radio" aria-checked={who === id} className={cn("px-3", who === id && "active")} onClick={() => setWho(id)}>{label}</button>
        ))}
      </div>
      <DueDateButton value={due} onChange={setDue} />
      <ColorPicker value={color} onChange={setColor} label="Цвет дела" />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>Отмена</Button>
        <Button type="submit" loading={pending}>Сохранить</Button>
      </div>
    </form>
  );
}