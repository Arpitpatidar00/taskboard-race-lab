import { injectable } from "tsyringe";
import { v4 as uuidv4 } from "uuid";
import type { ITaskRepository } from "../../domain/repositories/ITaskRepository.js";
import type { Task, TaskQuery, CreateTaskInput } from "../../types/task.js";

@injectable()
export class InMemoryTaskRepository implements ITaskRepository {
  private tasks: Map<string, Task> = new Map();

  constructor() {
    this.seed();
  }

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

  public findAll(query?: TaskQuery): Task[] {
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

  public findById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  public create(input: CreateTaskInput): Task {
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

  public update(id: string, data: Partial<Pick<Task, "title" | "status" | "priority" | "assignee">>): Task | undefined {
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
