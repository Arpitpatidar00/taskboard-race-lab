import type { MutationResult } from "../../types/task.js";

export interface IIdempotencyService {
  getResult(key: string | undefined): MutationResult | undefined;
  storeResult(key: string | undefined, statusCode: number, body: unknown): void;
}
