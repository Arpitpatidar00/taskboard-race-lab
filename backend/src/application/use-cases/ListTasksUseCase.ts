import { injectable, inject } from "tsyringe";
import type { ITaskRepository } from "../../domain/repositories/ITaskRepository.js";
import type { Task, TaskQuery } from "../../types/task.js";

@injectable()
export class ListTasksUseCase {
  constructor(
    @inject("ITaskRepository") private taskRepository: ITaskRepository
  ) {}

  public execute(query?: TaskQuery): { data: Task[]; total: number } {
    const tasks = this.taskRepository.findAll(query);
    return { data: tasks, total: tasks.length };
  }
}
