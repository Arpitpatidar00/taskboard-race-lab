import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import taskRoutes from "../../backend/src/routes/taskRoutes.js";
import { errorHandler } from "../../backend/src/middleware/errorHandler.js";

/**
 * Backend API tests — focus on race-condition behaviors:
 * version conflicts, idempotency, and validation.
 */

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/tasks", taskRoutes);
  app.use(errorHandler);
  return app;
}

describe("Task API", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    // Each test gets a fresh app instance.
    // Note: the repository is a singleton with seeded data, so
    // tasks persist across tests. We create new tasks for isolation.
    app = createApp();
  });

  // ─── Test: GET /api/tasks returns tasks ─────────────────────

  it("should return a list of tasks", async () => {
    const res = await request(app).get("/api/tasks");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  // ─── Test: GET /api/tasks with search filter ────────────────

  it("should filter tasks by search query", async () => {
    // First create a known task
    await request(app)
      .post("/api/tasks")
      .send({ title: "Unique Search Test XYZ123", priority: "high" })
      .set("Idempotency-Key", "search-test-1");

    const res = await request(app).get("/api/tasks?search=XYZ123");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].title).toContain("XYZ123");
  });

  // ─── Test: POST /api/tasks creates a task ───────────────────

  it("should create a task with auto-generated id, version=1, and updatedAt", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({
        title: "Test Create Task",
        status: "todo",
        priority: "high",
        assignee: "Arpit",
      })
      .set("Idempotency-Key", "create-test-1");

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.title).toBe("Test Create Task");
    expect(res.body.data.version).toBe(1);
    expect(res.body.data).toHaveProperty("updatedAt");
  });

  // ─── Test: POST validation — empty title ────────────────────

  it("should reject create with empty title", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "   ", priority: "high" })
      .set("Idempotency-Key", "create-empty-1");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  // ─── Test: POST validation — invalid status ─────────────────

  it("should reject create with invalid status", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "Valid Title", status: "invalid_status" })
      .set("Idempotency-Key", "create-invalid-status-1");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  // ─── Test 4: Backend version conflict ───────────────────────

  describe("Version conflict detection", () => {
    it("should accept PATCH with correct version and reject with stale version (409)", async () => {
      // Create a task
      const createRes = await request(app)
        .post("/api/tasks")
        .send({ title: "Conflict Test Task", priority: "medium" })
        .set("Idempotency-Key", "conflict-create-1");

      const taskId = createRes.body.data.id;
      expect(createRes.body.data.version).toBe(1);

      // First PATCH — version 1 → should succeed → version 2
      const patch1 = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ title: "Updated Once", version: 1 })
        .set("Idempotency-Key", "conflict-patch-1");

      expect(patch1.status).toBe(200);
      expect(patch1.body.data.version).toBe(2);

      // Second PATCH — still sending version 1 → should get 409
      const patch2 = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ title: "Should Fail", version: 1 })
        .set("Idempotency-Key", "conflict-patch-2");

      expect(patch2.status).toBe(409);
      expect(patch2.body.error.code).toBe("VERSION_CONFLICT");
      expect(patch2.body.error.currentTask.version).toBe(2);
    });
  });

  // ─── Test 6: Idempotency ────────────────────────────────────

  describe("Idempotency", () => {
    it("should return the same result for duplicate PATCH with same idempotency key", async () => {
      // Create task
      const createRes = await request(app)
        .post("/api/tasks")
        .send({ title: "Idempotency Test Task", priority: "low" })
        .set("Idempotency-Key", "idempotent-create-1");

      const taskId = createRes.body.data.id;

      const idempotencyKey = "idempotent-patch-same-key";

      // First request
      const res1 = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ title: "Updated Title", version: 1 })
        .set("Idempotency-Key", idempotencyKey);

      expect(res1.status).toBe(200);
      expect(res1.body.data.version).toBe(2);

      // Second request with SAME key — should return cached result
      const res2 = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ title: "Updated Title", version: 1 })
        .set("Idempotency-Key", idempotencyKey);

      expect(res2.status).toBe(200);
      expect(res2.body.data.version).toBe(2); // Same version, not incremented again
      expect(res2.body.data.title).toBe("Updated Title");
    });

    it("should return the same result for duplicate POST with same idempotency key", async () => {
      const key = "idempotent-post-same-key";

      const res1 = await request(app)
        .post("/api/tasks")
        .send({ title: "Duplicate Create Test", priority: "high" })
        .set("Idempotency-Key", key);

      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post("/api/tasks")
        .send({ title: "Duplicate Create Test", priority: "high" })
        .set("Idempotency-Key", key);

      // Should return the same cached response
      expect(res2.status).toBe(201);
      expect(res2.body.data.id).toBe(res1.body.data.id);
    });
  });

  // ─── Test: Status change as PATCH ───────────────────────────

  it("should change task status via PATCH", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .send({ title: "Status Change Test", status: "todo" })
      .set("Idempotency-Key", "status-create-1");

    const taskId = createRes.body.data.id;

    const patchRes = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .send({ status: "done", version: 1 })
      .set("Idempotency-Key", "status-patch-1");

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe("done");
    expect(patchRes.body.data.version).toBe(2);
  });

  // ─── Test: 404 for non-existent task ────────────────────────

  it("should return 404 for non-existent task", async () => {
    const res = await request(app).get("/api/tasks/nonexistent-id");
    expect(res.status).toBe(404);
  });
});
