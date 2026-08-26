import { v4 as uuidv4 } from "uuid";
import type { Task, TaskQuery, CreateTaskInput } from "../types/task.js";

/**
 * In-memory task repository backed by a Map<string, Task>.
 * The backend owns version numbering — clients never set it.
 */
class TaskRepository {
  private tasks: Map<string, Task> = new Map();

  constructor() {
    this.seed();
  }

  /** Seed with sample tasks for development. */
  private seed(): void {
    const sampleTasks: Omit<Task, "id" | "version" | "updatedAt">[] = [
      { title: "Set up project scaffolding", status: "done", priority: "high", assignee: "Arpit" },
      { title: "Design database schema", status: "done", priority: "high", assignee: "Rahul" },
      { title: "Implement user authentication", status: "in_progress", priority: "high", assignee: "Arpit" },
      { title: "Build REST API endpoints", status: "in_progress", priority: "high", assignee: "Rahul" },
      { title: "Create task list component", status: "in_progress", priority: "medium", assignee: "Priya" },
      { title: "Add search functionality", status: "todo", priority: "medium", assignee: "Arpit" },
      { title: "Implement status filters", status: "todo", priority: "medium" },
      { title: "Add priority sorting", status: "todo", priority: "low" },
      { title: "Write unit tests for API", status: "todo", priority: "high", assignee: "Rahul" },
      { title: "Set up CI/CD pipeline", status: "todo", priority: "medium", assignee: "Priya" },
      { title: "Add error handling middleware", status: "done", priority: "high", assignee: "Arpit" },
      { title: "Create task detail drawer", status: "todo", priority: "medium" },
      { title: "Implement optimistic updates", status: "todo", priority: "high", assignee: "Priya" },
      { title: "Add loading skeleton states", status: "todo", priority: "low" },
      { title: "Write integration tests", status: "todo", priority: "medium", assignee: "Rahul" },
    ];

    for (const task of sampleTasks) {
      const id = uuidv4();
      this.tasks.set(id, {
        ...task,
        id,
        version: 1,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /** Return all tasks, optionally filtered. */
  findAll(query?: TaskQuery): Task[] {
    let results = Array.from(this.tasks.values());

    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(searchLower) ||
          t.assignee?.toLowerCase().includes(searchLower)
      );
    }

    if (query?.status) {
      results = results.filter((t) => t.status === query.status);
    }

    if (query?.priority) {
      results = results.filter((t) => t.priority === query.priority);
    }

    return results;
  }

  /** Find a single task by ID. */
  findById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /** Create a new task. Backend generates id, version=1, updatedAt. */
  create(input: CreateTaskInput): Task {
    const id = uuidv4();
    const task: Task = {
      id,
      title: input.title,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      assignee: input.assignee,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, task);
    return task;
  }

  /**
   * Update an existing task in-place.
   * Increments version and sets updatedAt.
   * Returns the updated task.
   * Does NOT check version — that's the service's job.
   */
  update(id: string, data: Partial<Pick<Task, "title" | "status" | "priority" | "assignee">>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;

    const updated: Task = {
      ...existing,
      ...data,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    return updated;
  }
}

// Singleton
export const taskRepository = new TaskRepository();
