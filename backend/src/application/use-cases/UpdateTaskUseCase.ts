import { injectable, inject } from "tsyringe";
import type { ITaskRepository } from "../../domain/repositories/ITaskRepository.js";
import type { Task, UpdateTaskInput } from "../../types/task.js";
import { NotFoundError } from "../../domain/errors/NotFoundError.js";
import { ConflictError } from "../../domain/errors/ConflictError.js";

@injectable()
export class UpdateTaskUseCase {
  constructor(
    @inject("ITaskRepository") private taskRepository: ITaskRepository
  ) {}

  public execute(id: string, input: UpdateTaskInput): Task {
    const existing = this.taskRepository.findById(id);

    if (!existing) {
      throw new NotFoundError(`Task with id ${id} not found`);
    }

    if (input.version !== existing.version) {
      throw new ConflictError("Task has been modified elsewhere", existing);
    }

    const updateData: Partial<Pick<Task, "title" | "status" | "priority" | "assignee">> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.assignee !== undefined) updateData.assignee = input.assignee;

    const updated = this.taskRepository.update(id, updateData);
    
    if (!updated) {
      throw new NotFoundError(`Task with id ${id} not found during update`);
    }

    return updated;
  }
}
