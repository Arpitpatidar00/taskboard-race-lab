import { z } from "zod";

// --- Enums as Zod schemas ---

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

// --- Validation schemas ---

export const CreateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  status: TaskStatus.default("todo"),
  priority: TaskPriority.default("medium"),
  assignee: z.string().trim().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer")
    .optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  assignee: z.string().trim().optional(),
  version: z.number().int().positive("Version is required"),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// --- Query filter schema ---

export const TaskQuerySchema = z.object({
  search: z.string().optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
});
export type TaskQuery = z.infer<typeof TaskQuerySchema>;

// --- API response types ---

export type TaskListResponse = {
  data: Task[];
  total: number;
};

export type TaskResponse = {
  data: Task;
};

export type ConflictError = {
  error: {
    code: "VERSION_CONFLICT";
    message: string;
    currentTask: Task;
  };
};

// --- Idempotency result store ---

export type MutationResult = {
  statusCode: number;
  body: unknown;
  timestamp: string;
};
