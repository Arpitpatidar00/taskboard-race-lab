import { Router } from "express";
import { container } from "../infrastructure/di/container.js";
import { TaskController } from "../presentation/controllers/TaskController.js";
import {
  getUnreliableConfig,
  setUnreliableConfig,
} from "../middleware/unreliableApi.js";

const router = Router();
const taskController = container.resolve(TaskController);

// ─── GET /api/tasks ───────────────────────────────────────────────
router.get("/", taskController.listTasks);

// ─── GET /api/tasks/:id ──────────────────────────────────────────
router.get("/:id", taskController.getTask);

// ─── POST /api/tasks ─────────────────────────────────────────────
router.post("/", taskController.createTask);

// ─── PATCH /api/tasks/:id ────────────────────────────────────────
router.patch("/:id", taskController.updateTask);

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
