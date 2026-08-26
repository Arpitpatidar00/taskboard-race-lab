import { useQuery } from "@tanstack/react-query";
import { getTasks } from "@/features/tasks/api/taskApi";
import type { TaskFilters, Task, TaskListResponse } from "@/features/tasks/types/task";
import { queryClient } from "@/lib/queryClient";
import { taskKeys } from "../api/queryKeys";

/**
 * Query key factory for task list.
 */
export function tasksQueryKey(filters?: TaskFilters) {
  return taskKeys.list(filters ?? {});
}

/**
 * Fetch task list with race-condition protection:
 * - TanStack Query handles AbortController via queryFn signal
 * - structuralSharing protects against stale entity versions
 */
export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: tasksQueryKey(filters),
    queryFn: async ({ signal }) => {
      const requestId = Date.now();
      console.log(
        `[SEARCH] request=${requestId} search="${filters?.search ?? ""}" status="${filters?.status ?? ""}" priority="${filters?.priority ?? ""}" started`
      );

      const result = await getTasks(filters, signal);

      console.log(
        `[SEARCH] request=${requestId} completed count=${result.total}`
      );

      return result;
    },
    // Protect against stale entity versions when merging into cache.
    // If a cached task has a higher version than an incoming one, keep the cached version.
    structuralSharing: (oldData, newData) => {
      if (!oldData || !newData) return newData as TaskListResponse;

      const old = oldData as TaskListResponse;
      const incoming = newData as TaskListResponse;

      // Build a map of the best-known versions from the current cache
      const cachedVersions = new Map<string, number>();
      for (const task of old.data) {
        cachedVersions.set(task.id, task.version);
      }

      // Also check individual task caches
      for (const task of incoming.data) {
        const cachedSingle = queryClient.getQueryData<{ data: Task }>(["task", task.id]);
        if (cachedSingle?.data) {
          const existing = cachedVersions.get(task.id) ?? 0;
          if (cachedSingle.data.version > existing) {
            cachedVersions.set(task.id, cachedSingle.data.version);
          }
        }
      }

      // Merge: for each incoming task, keep whichever has the higher version
      const mergedData = incoming.data.map((incomingTask) => {
        const cachedVersion = cachedVersions.get(incomingTask.id);
        if (cachedVersion !== undefined && cachedVersion > incomingTask.version) {
          // The cached version is newer — find and keep it
          const cachedTask = old.data.find((t) => t.id === incomingTask.id);
          if (cachedTask) {
            console.log(
              `[STALE-PROTECTION] Rejected stale version=${incomingTask.version} for task=${incomingTask.id}, keeping version=${cachedVersion}`
            );
            return cachedTask;
          }
        }
        return incomingTask;
      });

      return {
        data: mergedData,
        total: incoming.total,
      };
    },
    placeholderData: (previousData) => previousData,
  });
}
