import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "tsyringe";
import { CreateTaskUseCase } from "../../application/use-cases/CreateTaskUseCase.js";
import { UpdateTaskUseCase } from "../../application/use-cases/UpdateTaskUseCase.js";
import { ListTasksUseCase } from "../../application/use-cases/ListTasksUseCase.js";
import { GetTaskUseCase } from "../../application/use-cases/GetTaskUseCase.js";
import type { IIdempotencyService } from "../../application/services/IIdempotencyService.js";
import { CreateTaskSchema, UpdateTaskSchema, TaskQuerySchema } from "../../types/task.js";
import { logger } from "../../infrastructure/logger/index.js";

@injectable()
export class TaskController {
  constructor(
    private createTaskUseCase: CreateTaskUseCase,
    private updateTaskUseCase: UpdateTaskUseCase,
    private listTasksUseCase: ListTasksUseCase,
    private getTaskUseCase: GetTaskUseCase,
    @inject("IIdempotencyService") private idempotencyService: IIdempotencyService
  ) {}

  public listTasks = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const query = TaskQuerySchema.parse(req.query);
      const result = this.listTasksUseCase.execute(query);

      logger.info(
        { search: query.search, status: query.status, priority: query.priority, total: result.total },
        "[TASKS] GET /api/tasks"
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  public getTask = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const task = this.getTaskUseCase.execute(req.params.id);
      res.json({ data: task });
    } catch (err) {
      next(err);
    }
  };

  public createTask = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

      const cached = this.idempotencyService.getResult(idempotencyKey);
      if (cached) {
        logger.info({ idempotencyKey }, "[IDEMPOTENCY] Returning cached result");
        res.status(cached.statusCode).json(cached.body);
        return;
      }

      const input = CreateTaskSchema.parse(req.body);
      const task = this.createTaskUseCase.execute(input);

      logger.info(
        { id: task.id, title: task.title, version: task.version },
        "[TASKS] POST /api/tasks"
      );

      const responseBody = { data: task };
      this.idempotencyService.storeResult(idempotencyKey, 201, responseBody);

      res.status(201).json(responseBody);
    } catch (err) {
      next(err);
    }
  };

  public updateTask = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

      const cached = this.idempotencyService.getResult(idempotencyKey);
      if (cached) {
        logger.info({ idempotencyKey }, "[IDEMPOTENCY] Returning cached result");
        res.status(cached.statusCode).json(cached.body);
        return;
      }

      const input = UpdateTaskSchema.parse(req.body);
      const task = this.updateTaskUseCase.execute(req.params.id, input);

      logger.info(
        { id: task.id, newVersion: task.version },
        "[MUTATION] success"
      );

      const responseBody = { data: task };
      this.idempotencyService.storeResult(idempotencyKey, 200, responseBody);
      
      res.json(responseBody);
    } catch (err) {
      next(err);
    }
  };
}
