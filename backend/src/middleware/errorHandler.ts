import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../domain/errors/AppError.js";
import { ConflictError } from "../domain/errors/ConflictError.js";
import { logger } from "../infrastructure/logger/index.js";

/**
 * Global error handler middleware.
 * Catches Domain Errors, Zod validation errors, and unexpected exceptions.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Domain Errors (AppError)
  if (err instanceof AppError) {
    if (err instanceof ConflictError) {
      logger.warn({ currentTaskVersion: err.currentTask.version }, `[MUTATION] Conflict: ${err.message}`);
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          currentTask: err.currentTask,
        },
      });
      return;
    }

    if (!err.isOperational) {
      logger.error(err, "[ERROR] Non-operational AppError");
    } else {
      logger.info(`[ERROR] ${err.code}: ${err.message}`);
    }

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Generic unexpected error
  logger.error(err, "[ERROR] Unhandled Exception");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
