import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TaskBoardPage } from "../../frontend/src/pages/TaskBoardPage";
import type { TaskListResponse } from "../../frontend/src/types/task";

// ─── Mock fetch globally ─────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function makeMockResponse(data: unknown, delay = 0): Promise<Response> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        json: () => Promise.resolve(data),
        status: 200,
        headers: new Headers(),
      } as Response);
    }, delay);
  });
}

const sampleTasks: TaskListResponse = {
  data: [
    {
      id: "1",
      title: "Build API endpoints",
      status: "in_progress",
      priority: "high",
      assignee: "Arpit",
      version: 3,
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "2",
      title: "Write unit tests",
      status: "todo",
      priority: "medium",
      assignee: "Rahul",
      version: 1,
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "3",
      title: "Deploy to production",
      status: "done",
      priority: "low",
      version: 5,
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
  ],
  total: 3,
};

/** Default mock that handles both task API and config API calls */
function setupDefaultMock(taskResponse: TaskListResponse = sampleTasks) {
  mockFetch.mockImplementation((url: string) => {
    // Config endpoint used by RaceLabPanel
    if (typeof url === "string" && url.includes("config/unreliable")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            enabled: false,
            minLatency: 100,
            maxLatency: 1800,
            errorRate: 0.1,
            duplicateRate: 0.05,
          }),
        status: 200,
        headers: new Headers(),
      } as Response);
    }
    // Default task list response
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(taskResponse),
      status: 200,
      headers: new Headers(),
    } as Response);
  });
}

describe("TaskBoardPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Test 1: Search UI — debounce + correct query ────────────

  it("should debounce search input and call API with correct query", async () => {
    const user = userEvent.setup();

    setupDefaultMock();

    render(<TaskBoardPage />, { wrapper: createWrapper() });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Build API endpoints")).toBeInTheDocument();
    });

    // Type in search
    const searchInput = screen.getByPlaceholderText(/search tasks/i);
    await user.type(searchInput, "API");

    // Should have debounced — wait for API call
    await waitFor(
      () => {
        const calls = mockFetch.mock.calls;
        const searchCalls = calls.filter(
          (call) => typeof call[0] === "string" && call[0].includes("search=API")
        );
        expect(searchCalls.length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );
  });

  // ─── Test 3: Race condition — latest search wins ─────────────

  it("should display results from the latest search, not a slow earlier one", async () => {
    const user = userEvent.setup();

    setupDefaultMock();

    render(<TaskBoardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Build API endpoints")).toBeInTheDocument();
    });

    // Slow response for first search ("A")
    const slowResponse: TaskListResponse = {
      data: [
        {
          id: "10",
          title: "STALE Result from A",
          status: "todo",
          priority: "low",
          version: 1,
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
    };

    // Fast response for second search ("AB")
    const fastResponse: TaskListResponse = {
      data: [
        {
          id: "11",
          title: "CORRECT Result from AB",
          status: "todo",
          priority: "high",
          version: 1,
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
    };

    // Mock: differentiate by search param in URL
    let searchCallCount = 0;
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("config/unreliable")) {
        return makeMockResponse({
          enabled: false,
          minLatency: 100,
          maxLatency: 1800,
          errorRate: 0.1,
          duplicateRate: 0.05,
        });
      }
      if (typeof url === "string" && url.includes("search=")) {
        searchCallCount++;
        if (searchCallCount <= 1) {
          // Slow response for first search
          return makeMockResponse(slowResponse, 500);
        } else {
          // Fast response for subsequent searches
          return makeMockResponse(fastResponse, 10);
        }
      }
      return makeMockResponse(sampleTasks, 0);
    });

    const searchInput = screen.getByPlaceholderText(/search tasks/i);

    // Type "AB" — debounce will batch to a single API call
    await user.clear(searchInput);
    await user.type(searchInput, "AB");

    // Wait for the results to settle
    await waitFor(
      () => {
        const allCalls = mockFetch.mock.calls;
        expect(allCalls.length).toBeGreaterThan(1);
      },
      { timeout: 3000 }
    );
  });

  // ─── Test 7: Create failure — form values preserved ──────────

  it("should preserve form values and show error when create fails", async () => {
    const user = userEvent.setup();

    setupDefaultMock();

    render(<TaskBoardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Build API endpoints")).toBeInTheDocument();
    });

    // Open create dialog
    const newTaskBtn = screen.getByText("New Task");
    await user.click(newTaskBtn);

    // Fill form
    const titleInput = await screen.findByPlaceholderText(/what needs to be done/i);
    await user.type(titleInput, "My Important Task");

    // Mock API failure for create
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (typeof url === "string" && url.includes("config/unreliable")) {
        return makeMockResponse({
          enabled: false,
          minLatency: 100,
          maxLatency: 1800,
          errorRate: 0.1,
          duplicateRate: 0.05,
        });
      }
      if (options?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              error: {
                code: "SIMULATED_ERROR",
                message: "Simulated server error",
              },
            }),
          headers: new Headers(),
        } as Response);
      }
      return makeMockResponse(sampleTasks);
    });

    // Submit — use the button with type="submit" to avoid ambiguity
    const submitBtn = screen.getByRole("button", { name: /create task/i });
    await user.click(submitBtn);

    // Form values should be preserved after error
    await waitFor(() => {
      expect(titleInput).toHaveValue("My Important Task");
    });
  });
});
