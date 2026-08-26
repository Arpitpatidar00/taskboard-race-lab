import express from "express";
import cors from "cors";
import taskRoutes from "./routes/taskRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { simulateUnreliableApi } from "./middleware/unreliableApi.js";

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
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Error handler ───────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(
    `\n🚀 Taskboard Race Lab backend running on http://localhost:${PORT}`,
  );
  console.log(`   API: http://localhost:${PORT}/api/tasks`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

export default app;
