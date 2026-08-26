import { apiRequest } from "@/lib/apiClient";
import type {
  TaskListResponse,
  TaskResponse,
  TaskFilters,
  UnreliableConfig,
} from "@/features/tasks/types/task";

// ─── Task queries ────────────────────────────────────────────────

export async function getTasks(
  filters?: TaskFilters,
  signal?: AbortSignal
): Promise<TaskListResponse> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);

  const queryString = params.toString();
  const endpoint = `/tasks${queryString ? `?${queryString}` : ""}`;

  return apiRequest<TaskListResponse>(endpoint, { signal });
}

export async function getTask(
  id: string,
  signal?: AbortSignal
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${id}`, { signal });
}

// ─── Task mutations ──────────────────────────────────────────────

export type CreateTaskData = {
  title: string;
  status?: string;
  priority?: string;
  assignee?: string;
};

export async function createTask(
  data: CreateTaskData,
  idempotencyKey: string
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>("/tasks", {
    method: "POST",
    body: data,
    idempotencyKey,
  });
}

export type UpdateTaskData = {
  title?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  version: number;
};

export async function updateTask(
  id: string,
  data: UpdateTaskData,
  idempotencyKey: string
): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${id}`, {
    method: "PATCH",
    body: data,
    idempotencyKey,
  });
}

// ─── Unreliable API config ──────────────────────────────────────

export async function getUnreliableConfig(): Promise<UnreliableConfig> {
  return apiRequest<UnreliableConfig>("/tasks/config/unreliable");
}

export async function updateUnreliableConfig(
  config: Partial<UnreliableConfig>
): Promise<UnreliableConfig> {
  return apiRequest<UnreliableConfig>("/tasks/config/unreliable", {
    method: "PATCH",
    body: config,
  });
}
