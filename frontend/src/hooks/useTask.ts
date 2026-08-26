import { useQuery } from "@tanstack/react-query";
import { getTask } from "@/api/taskApi";

/**
 * Fetch a single task by ID.
 * Protects against stale entity versions.
 */
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async ({ signal }) => {
      if (!taskId) throw new Error("No task ID");
      return getTask(taskId, signal);
    },
    enabled: !!taskId,
    structuralSharing: (oldData, newData) => {
      if (!oldData || !newData) return newData as { data: { version: number } };

      const old = oldData as { data: { version: number } };
      const incoming = newData as { data: { version: number } };

      // Reject stale entity
      if (incoming.data.version < old.data.version) {
        console.log(
          `[STALE-PROTECTION] Rejected stale version=${incoming.data.version}, keeping version=${old.data.version}`
        );
        return old;
      }

      return incoming;
    },
  });
}
