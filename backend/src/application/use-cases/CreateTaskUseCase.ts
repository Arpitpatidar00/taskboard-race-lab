import { injectable, inject } from "tsyringe";
import type { ITaskRepository } from "../../domain/repositories/ITaskRepository.js";
import type { Task, CreateTaskInput } from "../../types/task.js";

@injectable()
export class CreateTaskUseCase {
  constructor(
    @inject("ITaskRepository") private taskRepository: ITaskRepository
  ) {}

  public execute(input: CreateTaskInput): Task {
    return this.taskRepository.create(input);
  }
}
