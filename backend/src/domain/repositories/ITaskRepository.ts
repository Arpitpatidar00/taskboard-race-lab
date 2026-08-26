import type { Task, TaskQuery, CreateTaskInput } from "../../types/task.js";

export interface ITaskRepository {
  findAll(query?: TaskQuery): Task[];
  findById(id: string): Task | undefined;
  create(input: CreateTaskInput): Task;
  update(id: string, data: Partial<Pick<Task, "title" | "status" | "priority" | "assignee">>): Task | undefined;
}
