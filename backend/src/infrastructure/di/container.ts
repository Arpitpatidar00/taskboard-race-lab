import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";
import { InMemoryTaskRepository } from "../repositories/InMemoryTaskRepository.js";
import { InMemoryIdempotencyService } from "../services/InMemoryIdempotencyService.js";

// Register implementations against interfaces as singletons
container.registerSingleton("ITaskRepository", InMemoryTaskRepository);
container.registerSingleton("IIdempotencyService", InMemoryIdempotencyService);

export { container };
