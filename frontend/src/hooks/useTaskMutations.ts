import { useMutation } from "@tanstack/react-query";
import { createTask, updateTask } from "@/api/taskApi";
import type { CreateTaskData, UpdateTaskData } from "@/api/taskApi";
import type { Task, TaskListResponse } from "@/types/task";
import { queryClient } from "@/lib/queryClient";
import { generateId } from "@/lib/utils";
import { ApiRequestError } from "@/api/apiClient";

// ─── Create task mutation ────────────────────────────────────────

export function useCreateTask() {
  return useMutation({
    mutationFn: (data: CreateTaskData) => {
      const idempotencyKey = generateId();
      console.log(
        `[MUTATION] create title="${data.title}" idempotencyKey=${idempotencyKey}`
      );
      return createTask(data, idempotencyKey);
    },
    onSuccess: (result) => {
      console.log(
        `[MUTATION] create success id=${result.data.id} version=${result.data.version}`
      );
      // Invalidate all task list queries to pick up the new task
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ─── Update task mutation (with optimistic update + rollback) ────

type UpdateTaskVariables = {
  taskId: string;
  data: UpdateTaskData;
  idempotencyKey?: string;
};

type OptimisticContext = {
  previousTask: { data: Task } | undefined;
  previousLists: [readonly unknown[], TaskListResponse | undefined][];
};

export function useUpdateTask() {
  return useMutation<
    { data: Task },
    Error,
    UpdateTaskVariables,
    OptimisticContext
  >({
    mutationFn: ({ taskId, data, idempotencyKey }) => {
      const key = idempotencyKey ?? generateId();
      console.log(
        `[MUTATION] update task=${taskId} version=${data.version} idempotencyKey=${key}`
      );
      return updateTask(taskId, data, key);
    },

    // ─── Optimistic update ─────────────────────────────────────
    onMutate: async (variables) => {
      // Cancel any outgoing queries for this task and task lists
      await queryClient.cancelQueries({ queryKey: ["task", variables.taskId] });
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot previous state for rollback
      const previousTask = queryClient.getQueryData<{ data: Task }>([
        "task",
        variables.taskId,
      ]);

      // Snapshot all task list queries
      const previousLists: [readonly unknown[], TaskListResponse | undefined][] = [];
      const listQueries = queryClient.getQueriesData<TaskListResponse>({
        queryKey: ["tasks"],
      });
      for (const [key, data] of listQueries) {
        previousLists.push([key, data]);
      }

      // Optimistically update the single task cache
      if (previousTask) {
        queryClient.setQueryData(["task", variables.taskId], {
          data: {
            ...previousTask.data,
            ...variables.data,
            version: previousTask.data.version + 1,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      // Optimistically update task in all list caches
      for (const [key, listData] of listQueries) {
        if (listData) {
          queryClient.setQueryData(key, {
            ...listData,
            data: listData.data.map((task) =>
              task.id === variables.taskId
                ? {
                    ...task,
                    ...variables.data,
                    version: task.version + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : task
            ),
          });
        }
      }

      console.log(
        `[MUTATION] optimistic update applied for task=${variables.taskId}`
      );

      return { previousTask, previousLists };
    },

    // ─── Rollback on error ─────────────────────────────────────
    onError: (error, variables, context) => {
      if (context) {
        // Restore the single task cache
        if (context.previousTask) {
          queryClient.setQueryData(
            ["task", variables.taskId],
            context.previousTask
          );
        }

        // Restore all list caches
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }

        console.log(
          `[MUTATION] rollback applied for task=${variables.taskId}`
        );
      }

      // Check for version conflict
      if (error instanceof ApiRequestError && error.statusCode === 409) {
        console.log(
          `[MUTATION] conflict detected for task=${variables.taskId}`
        );
        // The conflict error body contains the current server task.
        // The component will handle showing the conflict UI.
      }
    },

    // ─── Reconcile on settled ──────────────────────────────────
    onSettled: (_data, _error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
