import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import taskRoutes from "./routes/taskRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { simulateUnreliableApi } from "./middleware/unreliableApi.js";
import { logger } from "./infrastructure/logger/index.js";

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const app = express();
const PORT = parseInt(process.env.PORT ?? "8000", 10);

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Unreliable API simulation — applied to /api/tasks routes only
app.use("/api/tasks", simulateUnreliableApi());

// ─── Routes ──────────────────────────────────────────────────────
app.use("/api/tasks", taskRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handling middleware must be last
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/tasks`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

export default app;
