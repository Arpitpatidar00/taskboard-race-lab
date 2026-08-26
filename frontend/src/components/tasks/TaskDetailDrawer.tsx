import { useState } from "react";
import type { Task, UpdateTaskFormValues } from "@/types/task";
import { useTask } from "@/hooks/useTask";
import { useUpdateTask } from "@/hooks/useTaskMutations";
import { EditTaskForm } from "./TaskForm";
import { TaskStatusBadge, TaskPriorityBadge } from "./TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ApiRequestError } from "@/api/apiClient";
import {
  X,
  Pencil,
  AlertTriangle,
  RefreshCw,
  User,
  Clock,
  Hash,
  Loader2,
} from "lucide-react";

type TaskDetailDrawerProps = {
  taskId: string | null;
  onClose: () => void;
};

export function TaskDetailDrawer({ taskId, onClose }: TaskDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [conflictTask, setConflictTask] = useState<Task | null>(null);

  const { data, isLoading, isError, error, refetch } = useTask(taskId);
  const updateMutation = useUpdateTask();

  const task = data?.data;

  if (!taskId) return null;

  const handleSave = (formData: UpdateTaskFormValues) => {
    if (!task) return;

    setMutationError(null);
    setConflictTask(null);

    updateMutation.mutate(
      {
        taskId: task.id,
        data: {
          title: formData.title,
          status: formData.status,
          priority: formData.priority,
          assignee: formData.assignee || undefined,
          version: task.version,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setMutationError(null);
        },
        onError: (err) => {
          if (err instanceof ApiRequestError && err.statusCode === 409) {
            const serverTask = err.body.error.currentTask;
            if (serverTask) {
              setConflictTask(serverTask as Task);
            }
            setMutationError("This task was modified elsewhere. Your changes were not applied.");
          } else {
            setMutationError(err.message || "Couldn't save changes. Your previous value has been restored.");
          }
        },
      }
    );
  };

  const handleReloadLatest = () => {
    setConflictTask(null);
    setMutationError(null);
    setIsEditing(false);
    refetch();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative w-full max-w-md bg-white shadow-xl animate-in slide-in-from-right border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Task Details</h2>
          <button
            onClick={onClose}
            className="rounded-sm p-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Loading */}
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 w-3/4 bg-slate-200 rounded" />
              <div className="h-5 w-1/3 bg-slate-200 rounded-full" />
              <div className="h-5 w-1/4 bg-slate-200 rounded-full" />
              <div className="h-4 w-1/2 bg-slate-200 rounded" />
              <div className="h-4 w-1/3 bg-slate-200 rounded" />
              <div className="h-4 w-2/5 bg-slate-200 rounded" />
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="flex flex-col items-center py-12 text-center">
              <AlertTriangle className="size-10 text-red-400 mb-3" />
              <p className="text-sm text-slate-600 mb-3">
                {error?.message ?? "Failed to load task details."}
              </p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="size-3.5" />
                Retry
              </Button>
            </div>
          )}

          {/* Conflict UI */}
          {conflictTask && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Conflict detected
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    This task was modified elsewhere. Your changes were not applied.
                  </p>
                  <p className="text-xs text-amber-600 mt-2">
                    Server version: {conflictTask.version} · Updated: {formatDate(conflictTask.updatedAt)}
                  </p>
                  <Button
                    onClick={handleReloadLatest}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    <RefreshCw className="size-3.5" />
                    Load latest
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Task detail / Edit form */}
          {task && !isLoading && (
            <>
              {isEditing ? (
                <EditTaskForm
                  task={task}
                  onSubmit={handleSave}
                  isPending={updateMutation.isPending}
                  error={mutationError}
                />
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">
                      {task.title}
                    </h3>
                    <div className="flex gap-2">
                      <TaskStatusBadge status={task.status} />
                      <TaskPriorityBadge priority={task.priority} />
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="size-4 text-slate-400" />
                      <span className="font-medium">Assignee:</span>
                      <span>{task.assignee || "Unassigned"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Hash className="size-4 text-slate-400" />
                      <span className="font-medium">Version:</span>
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                        {task.version}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="size-4 text-slate-400" />
                      <span className="font-medium">Updated:</span>
                      <span>{formatDate(task.updatedAt)}</span>
                    </div>
                  </div>

                  {mutationError && !conflictTask && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-700">{mutationError}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setIsEditing(true);
                      setMutationError(null);
                      setConflictTask(null);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Pencil className="size-4" />
                    Edit Task
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick status change (visible when not editing) */}
        {task && !isEditing && !isLoading && (
          <div className="border-t border-slate-200 px-6 py-3">
            <p className="text-xs font-medium text-slate-500 mb-2">Quick Status</p>
            <div className="flex gap-2">
              {(["todo", "in_progress", "done"] as const).map((status) => (
                <Button
                  key={status}
                  variant={task.status === status ? "default" : "outline"}
                  size="sm"
                  disabled={task.status === status || updateMutation.isPending}
                  onClick={() => {
                    setMutationError(null);
                    setConflictTask(null);
                    updateMutation.mutate(
                      {
                        taskId: task.id,
                        data: { status, version: task.version },
                      },
                      {
                        onError: (err) => {
                          if (err instanceof ApiRequestError && err.statusCode === 409) {
                            const serverTask = err.body.error.currentTask;
                            if (serverTask) setConflictTask(serverTask as Task);
                            setMutationError("This task was modified elsewhere.");
                          } else {
                            setMutationError("Couldn't save changes. Your previous value has been restored.");
                          }
                        },
                      }
                    );
                  }}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  {status === "todo" ? "To Do" : status === "in_progress" ? "In Progress" : "Done"}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
