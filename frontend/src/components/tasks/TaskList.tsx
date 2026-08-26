import type { Task } from "@/types/task";
import { TaskRow } from "./TaskRow";
import { Button } from "@/components/ui/button";
import { AlertCircle, Inbox, SearchX, FilterX, Loader2 } from "lucide-react";

type TaskListProps = {
  tasks: Task[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  hasSearch: boolean;
  hasFilters: boolean;
  onTaskClick: (task: Task) => void;
  onRetry: () => void;
};

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      <td className="py-3 px-4"><div className="h-4 w-48 bg-slate-200 rounded" /></td>
      <td className="py-3 px-4"><div className="h-5 w-20 bg-slate-200 rounded-full" /></td>
      <td className="py-3 px-4"><div className="h-5 w-16 bg-slate-200 rounded-full" /></td>
      <td className="py-3 px-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
    </tr>
  );
}

export function TaskList({
  tasks,
  isLoading,
  isFetching,
  isError,
  error,
  hasSearch,
  hasFilters,
  onTaskClick,
  onRetry,
}: TaskListProps) {
  // ─── Error state ─────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="size-12 text-red-400 mb-3" />
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Unable to load tasks
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          {error?.message ?? "Something went wrong."}
        </p>
        <Button onClick={onRetry} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  // ─── Initial loading state ───────────────────────────────────
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Task</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Priority</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── Empty states ────────────────────────────────────────────
  if (!tasks || tasks.length === 0) {
    let icon = <Inbox className="size-12 text-slate-300 mb-3" />;
    let title = "No tasks yet";
    let description = "Create your first task to get started.";

    if (hasSearch) {
      icon = <SearchX className="size-12 text-slate-300 mb-3" />;
      title = "No tasks match your search";
      description = "Try a different search term.";
    } else if (hasFilters) {
      icon = <FilterX className="size-12 text-slate-300 mb-3" />;
      title = "No tasks match these filters";
      description = "Try changing or clearing the filters.";
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        {icon}
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    );
  }

  // ─── Task table ──────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 relative">
      {/* Fetching indicator (for background refetches, filter changes) */}
      {isFetching && !isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600/20 overflow-hidden">
          <div className="h-full w-1/3 bg-indigo-600 animate-pulse rounded-full" />
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-3 px-4 font-semibold text-slate-600">Task</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">Priority</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-600">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </tbody>
      </table>

      {/* Fetching overlay for filter/search changes */}
      {isFetching && !isLoading && (
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full px-3 py-1.5 shadow-sm text-xs text-slate-500">
            <Loader2 className="size-3 animate-spin" />
            Updating...
          </div>
        </div>
      )}
    </div>
  );
}
