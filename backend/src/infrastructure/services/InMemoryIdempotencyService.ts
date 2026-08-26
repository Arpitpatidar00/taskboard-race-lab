import { injectable } from "tsyringe";
import type { IIdempotencyService } from "../../application/services/IIdempotencyService.js";
import type { MutationResult } from "../../types/task.js";

@injectable()
export class InMemoryIdempotencyService implements IIdempotencyService {
  private idempotencyStore: Map<string, MutationResult> = new Map();
  private readonly IDEMPOTENCY_TTL_MS = 60 * 60 * 1000;

  constructor() {
    setInterval(() => this.cleanupStore(), this.IDEMPOTENCY_TTL_MS);
  }

  private cleanupStore(): void {
    const now = Date.now();
    for (const [key, result] of this.idempotencyStore) {
      if (now - new Date(result.timestamp).getTime() > this.IDEMPOTENCY_TTL_MS) {
        this.idempotencyStore.delete(key);
      }
    }
  }

  public getResult(key: string | undefined): MutationResult | undefined {
    if (!key) return undefined;
    return this.idempotencyStore.get(key);
  }

  public storeResult(key: string | undefined, statusCode: number, body: unknown): void {
    if (!key) return;
    this.idempotencyStore.set(key, {
      statusCode,
      body,
      timestamp: new Date().toISOString(),
    });
  }
}
