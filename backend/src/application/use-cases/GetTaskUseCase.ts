import { injectable, inject } from "tsyringe";
import type { ITaskRepository } from "../../domain/repositories/ITaskRepository.js";
import type { Task } from "../../types/task.js";
import { NotFoundError } from "../../domain/errors/NotFoundError.js";

@injectable()
export class GetTaskUseCase {
  constructor(
    @inject("ITaskRepository") private taskRepository: ITaskRepository
  ) {}

  public execute(id: string): Task {
    const task = this.taskRepository.findById(id);
    
    if (!task) {
      throw new NotFoundError(`Task with id ${id} not found`);
    }

    return task;
  }
}
