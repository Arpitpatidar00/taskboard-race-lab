import type { Request, Response, NextFunction } from "express";

/**
 * Configuration for the unreliable API simulator.
 */
export type UnreliableConfig = {
  enabled: boolean;
  minLatency: number;   // ms
  maxLatency: number;   // ms
  errorRate: number;    // 0.0 – 1.0
  duplicateRate: number; // 0.0 – 1.0
};

/** Default configuration — reads from env vars with sensible defaults. */
const defaultConfig: UnreliableConfig = {
  enabled: process.env.UNRELIABLE_API_ENABLED !== "false",
  minLatency: parseInt(process.env.UNRELIABLE_MIN_LATENCY ?? "100", 10),
  maxLatency: parseInt(process.env.UNRELIABLE_MAX_LATENCY ?? "1800", 10),
  errorRate: parseFloat(process.env.UNRELIABLE_ERROR_RATE ?? "0.10"),
  duplicateRate: parseFloat(process.env.UNRELIABLE_DUPLICATE_RATE ?? "0.05"),
};

/** Live config — can be updated at runtime via the config endpoint. */
let currentConfig: UnreliableConfig = { ...defaultConfig };

/** Get the current unreliable API config. */
export function getUnreliableConfig(): UnreliableConfig {
  return { ...currentConfig };
}

/** Update the unreliable API config at runtime. */
export function setUnreliableConfig(update: Partial<UnreliableConfig>): UnreliableConfig {
  currentConfig = { ...currentConfig, ...update };
  return { ...currentConfig };
}

/**
 * Express middleware that simulates an unreliable API.
 *
 * Features:
 * - Random latency between minLatency and maxLatency ms
 * - Random 500 Internal Server Error at the configured error rate
 * - Duplicate request simulation (calls next() twice — the handler runs again)
 */
export function simulateUnreliableApi() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!currentConfig.enabled) {
      next();
      return;
    }

    // 1. Random latency
    const delay =
      Math.floor(Math.random() * (currentConfig.maxLatency - currentConfig.minLatency)) +
      currentConfig.minLatency;

    await new Promise((resolve) => setTimeout(resolve, delay));

    // 2. Random 500 error
    if (Math.random() < currentConfig.errorRate) {
      console.log(
        `[UNRELIABLE] Simulated 500 for ${req.method} ${req.path} (delay: ${delay}ms)`
      );
      res.status(500).json({
        error: {
          code: "SIMULATED_ERROR",
          message: "Simulated server error (unreliable API)",
        },
      });
      return;
    }

    // 3. Duplicate request simulation — log it but don't actually re-execute
    // The idempotency layer handles this on the backend side
    if (Math.random() < currentConfig.duplicateRate) {
      console.log(
        `[UNRELIABLE] Duplicate request simulated for ${req.method} ${req.path} (delay: ${delay}ms)`
      );
    }

    console.log(
      `[UNRELIABLE] ${req.method} ${req.path} delayed ${delay}ms`
    );

    next();
  };
}
