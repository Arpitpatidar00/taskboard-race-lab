import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useCreateTask } from "@/hooks/useTaskMutations";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { TaskSearch } from "@/components/tasks/TaskSearch";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { CreateTaskForm } from "@/components/tasks/TaskForm";
import { RaceLabPanel } from "@/components/common/RaceLabPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Task, TaskStatus, TaskPriority, CreateTaskFormValues } from "@/types/task";
import { Plus, Beaker } from "lucide-react";

export function TaskBoardPage() {
  // ─── URL state ─────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInput = searchParams.get("search") ?? "";
  const statusFilter = (searchParams.get("status") as TaskStatus) || undefined;
  const priorityFilter = (searchParams.get("priority") as TaskPriority) || undefined;

  // ─── Debounced search ──────────────────────────────────────────
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // ─── Local UI state ────────────────────────────────────────────
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ─── Server state ──────────────────────────────────────────────
  const filters = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    priority: priorityFilter,
  };

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useTasks(filters);

  const createMutation = useCreateTask();

  // ─── URL update helpers ────────────────────────────────────────
  const updateSearchParam = (key: string, value: string | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  };

  // ─── Handlers ──────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    updateSearchParam("search", value || undefined);
  };

  const handleStatusChange = (status: TaskStatus | undefined) => {
    updateSearchParam("status", status);
  };

  const handlePriorityChange = (priority: TaskPriority | undefined) => {
    updateSearchParam("priority", priority);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const handleCreateSubmit = (formData: CreateTaskFormValues) => {
    setCreateError(null);
    createMutation.mutate(
      {
        title: formData.title,
        status: formData.status,
        priority: formData.priority,
        assignee: formData.assignee || undefined,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setCreateError(null);
        },
        onError: (err) => {
          setCreateError(err.message || "Failed to create task. Please try again.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Beaker className="size-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Taskboard Race Lab
              </h1>
              <p className="text-xs text-slate-500">
                Race-condition & consistency laboratory
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} id="new-task-btn">
            <Plus className="size-4" />
            New Task
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <TaskSearch
              value={searchInput}
              onChange={handleSearchChange}
              isLoading={isFetching && !!debouncedSearch}
            />
          </div>
          <TaskFilters
            status={statusFilter}
            priority={priorityFilter}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
          />
        </div>

        {/* Task count */}
        {data && !isLoading && (
          <p className="text-sm text-slate-500">
            {data.total} task{data.total !== 1 ? "s" : ""}
            {debouncedSearch && (
              <span> matching &quot;{debouncedSearch}&quot;</span>
            )}
          </p>
        )}

        {/* Task list */}
        <TaskList
          tasks={data?.data}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          error={error}
          hasSearch={!!debouncedSearch}
          hasFilters={!!statusFilter || !!priorityFilter}
          onTaskClick={handleTaskClick}
          onRetry={() => refetch()}
        />
      </main>

      {/* Create task dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to the board.
            </DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            onSubmit={handleCreateSubmit}
            isPending={createMutation.isPending}
            error={createError}
          />
        </DialogContent>
      </Dialog>

      {/* Task detail drawer */}
      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Dev-only race lab panel */}
      <RaceLabPanel />
    </div>
  );
}
