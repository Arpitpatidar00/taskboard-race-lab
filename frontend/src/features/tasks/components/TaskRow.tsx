import type { Task } from "@/features/tasks/types/task";
import { TaskStatusBadge, TaskPriorityBadge } from "./TaskStatusBadge";
import { User } from "lucide-react";

type TaskRowProps = {
  task: Task;
  onClick: (task: Task) => void;
};

export function TaskRow({ task, onClick }: TaskRowProps) {
  return (
    <tr
      className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors group"
      onClick={() => onClick(task)}
      data-testid={`task-row-${task.id}`}
    >
      <td className="py-3 px-4">
        <span className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
          {task.title}
        </span>
      </td>
      <td className="py-3 px-4">
        <TaskStatusBadge status={task.status} />
      </td>
      <td className="py-3 px-4">
        <TaskPriorityBadge priority={task.priority} />
      </td>
      <td className="py-3 px-4">
        {task.assignee ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <User className="size-3.5" />
            {task.assignee}
          </span>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}
