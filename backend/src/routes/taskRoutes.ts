import { Router } from "express";
import { taskService } from "../services/taskService.js";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskQuerySchema,
} from "../types/task.js";
import {
  getUnreliableConfig,
  setUnreliableConfig,
} from "../middleware/unreliableApi.js";

const router = Router();

// ─── GET /api/tasks ───────────────────────────────────────────────
// List tasks with optional search/status/priority query filters.

router.get("/", (req, res, next) => {
  try {
    const query = TaskQuerySchema.parse(req.query);
    const result = taskService.listTasks(query);

    console.log(
      `[TASKS] GET /api/tasks search="${query.search ?? ""}" status="${query.status ?? ""}" priority="${query.priority ?? ""}" → ${result.total} results`
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/tasks/:id ──────────────────────────────────────────
// Get a single task.

router.get("/:id", (req, res) => {
  const task = taskService.getTask(req.params.id);

  if (!task) {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Task not found" },
    });
    return;
  }

  res.json({ data: task });
});

// ─── POST /api/tasks ─────────────────────────────────────────────
// Create a new task.

router.post("/", (req, res, next) => {
  try {
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

    // Check idempotency
    const cached = taskService.getIdempotencyResult(idempotencyKey);
    if (cached) {
      console.log(`[IDEMPOTENCY] Returning cached result for key="${idempotencyKey}"`);
      res.status(cached.statusCode).json(cached.body);
      return;
    }

    const input = CreateTaskSchema.parse(req.body);
    const task = taskService.createTask(input);

    console.log(
      `[TASKS] POST /api/tasks title="${task.title}" → id=${task.id} version=${task.version}`
    );

    const responseBody = { data: task };
    taskService.storeIdempotencyResult(idempotencyKey, 201, responseBody);

    res.status(201).json(responseBody);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/tasks/:id ────────────────────────────────────────
// Update a task with version-based conflict detection.

router.patch("/:id", (req, res, next) => {
  try {
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

    // Check idempotency
    const cached = taskService.getIdempotencyResult(idempotencyKey);
    if (cached) {
      console.log(`[IDEMPOTENCY] Returning cached result for key="${idempotencyKey}"`);
      res.status(cached.statusCode).json(cached.body);
      return;
    }

    const input = UpdateTaskSchema.parse(req.body);
    const result = taskService.updateTask(req.params.id, input);

    if (!result.success) {
      if (result.code === "NOT_FOUND") {
        const body = {
          error: { code: "NOT_FOUND", message: "Task not found" },
        };
        taskService.storeIdempotencyResult(idempotencyKey, 404, body);
        res.status(404).json(body);
        return;
      }

      if (result.code === "VERSION_CONFLICT") {
        console.log(
          `[MUTATION] conflict clientVersion=${input.version} serverVersion=${result.currentTask.version}`
        );
        const body = {
          error: {
            code: "VERSION_CONFLICT" as const,
            message: "Task has been modified",
            currentTask: result.currentTask,
          },
        };
        // Don't cache conflict results — client should retry with correct version
        res.status(409).json(body);
        return;
      }
    }

    if (result.success) {
      console.log(
        `[MUTATION] success task=${result.task.id} newVersion=${result.task.version}`
      );
      const responseBody = { data: result.task };
      taskService.storeIdempotencyResult(idempotencyKey, 200, responseBody);
      res.json(responseBody);
    }
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/config/unreliable ──────────────────────────────────
// Get current unreliable API config (dev only).

router.get("/config/unreliable", (_req, res) => {
  res.json(getUnreliableConfig());
});

// ─── PATCH /api/config/unreliable ────────────────────────────────
// Update unreliable API config at runtime (dev only).

router.patch("/config/unreliable", (req, res) => {
  const updated = setUnreliableConfig(req.body);
  res.json(updated);
});

export default router;
