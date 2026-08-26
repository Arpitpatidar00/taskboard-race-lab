import { taskRepository } from "../repositories/taskRepository.js";
import type {
  Task,
  TaskQuery,
  CreateTaskInput,
  UpdateTaskInput,
  MutationResult,
  TaskListResponse,
} from "../types/task.js";

/**
 * Task service — business logic layer.
 *
 * Handles:
 * - Version-based conflict detection (optimistic concurrency)
 * - Idempotency key tracking
 */
class TaskService {
  /** Idempotency store: key → { statusCode, body, timestamp } */
  private idempotencyStore: Map<string, MutationResult> = new Map();

  /** Max age for idempotency entries (1 hour). */
  private readonly IDEMPOTENCY_TTL_MS = 60 * 60 * 1000;

  constructor() {
    // Periodically clean up expired idempotency entries
    setInterval(() => this.cleanupIdempotencyStore(), this.IDEMPOTENCY_TTL_MS);
  }

  private cleanupIdempotencyStore(): void {
    const now = Date.now();
    for (const [key, result] of this.idempotencyStore) {
      if (now - new Date(result.timestamp).getTime() > this.IDEMPOTENCY_TTL_MS) {
        this.idempotencyStore.delete(key);
      }
    }
  }

  // --- Idempotency helpers ---

  /** Check if a mutation result is already stored for this key. */
  getIdempotencyResult(key: string | undefined): MutationResult | undefined {
    if (!key) return undefined;
    return this.idempotencyStore.get(key);
  }

  /** Store a mutation result for an idempotency key. */
  storeIdempotencyResult(key: string | undefined, statusCode: number, body: unknown): void {
    if (!key) return;
    this.idempotencyStore.set(key, {
      statusCode,
      body,
      timestamp: new Date().toISOString(),
    });
  }

  // --- Query operations ---

  listTasks(query?: TaskQuery): TaskListResponse {
    const tasks = taskRepository.findAll(query);
    return { data: tasks, total: tasks.length };
  }

  getTask(id: string): Task | undefined {
    return taskRepository.findById(id);
  }

  // --- Mutation operations ---

  createTask(input: CreateTaskInput): Task {
    return taskRepository.create(input);
  }

  /**
   * Update a task with version-based conflict detection.
   *
   * Algorithm:
   * 1. Find task → 404 if missing
   * 2. Compare clientVersion === currentVersion → 409 if mismatch
   * 3. Apply mutation → version++, updatedAt = now
   * 4. Return updated task
   */
  updateTask(
    id: string,
    input: UpdateTaskInput
  ): { success: true; task: Task } | { success: false; code: "NOT_FOUND" } | { success: false; code: "VERSION_CONFLICT"; currentTask: Task } {
    const existing = taskRepository.findById(id);

    if (!existing) {
      return { success: false, code: "NOT_FOUND" };
    }

    // Version conflict detection
    if (input.version !== existing.version) {
      return {
        success: false,
        code: "VERSION_CONFLICT",
        currentTask: existing,
      };
    }

    // Apply only the fields that were sent
    const updateData: Partial<Pick<Task, "title" | "status" | "priority" | "assignee">> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.assignee !== undefined) updateData.assignee = input.assignee;

    const updated = taskRepository.update(id, updateData);
    if (!updated) {
      return { success: false, code: "NOT_FOUND" };
    }

    return { success: true, task: updated };
  }
}

// Singleton
export const taskService = new TaskService();
