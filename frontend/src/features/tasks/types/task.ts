import { z } from "zod";

// --- Enums ---

export const TaskStatus = z.enum(["todo", "in_progress", "done"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskPriority = z.enum(["low", "medium", "high"]);
export type TaskPriority = z.infer<typeof TaskPriority>;

// --- Core Task type ---

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  version: number;
  updatedAt: string;
};

// --- API response types ---

export type TaskListResponse = {
  data: Task[];
  total: number;
};

export type TaskResponse = {
  data: Task;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    currentTask?: Task;
  };
};

// --- Form schemas ---

export const CreateTaskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  status: TaskStatus,
  priority: TaskPriority,
  assignee: z.string().trim(),
});
export type CreateTaskFormValues = z.infer<typeof CreateTaskFormSchema>;

export const UpdateTaskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  status: TaskStatus,
  priority: TaskPriority,
  assignee: z.string().trim(),
});
export type UpdateTaskFormValues = z.infer<typeof UpdateTaskFormSchema>;

// --- Filter types ---

export type TaskFilters = {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
};

// --- Unreliable API config ---

export type UnreliableConfig = {
  enabled: boolean;
  minLatency: number;
  maxLatency: number;
  errorRate: number;
  duplicateRate: number;
};
