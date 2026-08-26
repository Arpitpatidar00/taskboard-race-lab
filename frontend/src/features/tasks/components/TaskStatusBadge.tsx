import { Badge } from "@/components/ui/badge";
import type { TaskStatus as TStatus, TaskPriority as TPriority } from "@/features/tasks/types/task";

const statusLabels: Record<TStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const priorityLabels: Record<TPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function TaskStatusBadge({ status }: { status: TStatus }) {
  return <Badge variant={status}>{statusLabels[status]}</Badge>;
}

export function TaskPriorityBadge({ priority }: { priority: TPriority }) {
  return <Badge variant={priority}>{priorityLabels[priority]}</Badge>;
}
