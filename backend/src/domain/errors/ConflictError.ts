import { AppError } from "./AppError.js";
import { Task } from "../../types/task.js";

export class ConflictError extends AppError {
  public readonly currentTask: Task;

  constructor(message: string, currentTask: Task) {
    super(message, 409, "VERSION_CONFLICT");
    this.currentTask = currentTask;
  }
}
