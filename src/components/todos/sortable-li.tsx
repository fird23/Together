"use client";

import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/utils/cn";

/** Строка списка, которую можно перетащить за ручку слева. Перетаскивание только по вертикали и только за ручку, поэтому прокрутка пальцем не мешает. */
export function SortableLi({ id, enabled, className, style, children }: {
  id: string; enabled: boolean; className?: string; style?: React.CSSProperties; children: (grip: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !enabled });
  const grip = enabled ? (
    <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} className="todo-grip" aria-label="Перетащить, чтобы изменить порядок">
      <GripVertical size={17} aria-hidden />
    </button>
  ) : null;
  return (
    <li ref={setNodeRef} className={cn(className, isDragging && "is-dragging")}
      style={{ ...style, transform: CSS.Transform.toString(transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null), transition, position: "relative", zIndex: isDragging ? 5 : undefined }}>
      {children(grip)}
    </li>
  );
}
