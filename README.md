# Taskboard Race Lab

A race-condition and consistency laboratory built with React, TypeScript, TanStack Query, and Express. This application demonstrates correct handling of asynchronous UI problems: stale search responses, optimistic mutations with rollback, version-based conflict detection, and idempotent mutations.

## Quick Start

```bash
# Install dependencies
npm install

# Start both backend and frontend
npm run dev

# Or start individually
npm run dev --prefix backend    # http://localhost:8000
npm run dev --prefix frontend   # http://localhost:5173
```

## Architecture

```text
taskboard-race-lab/
├── backend/                  # Express + TypeScript API
│   └── src/
│       ├── routes/           # REST endpoints
│       ├── services/         # Business logic (version check, idempotency)
│       ├── repositories/     # In-memory Map<string, Task>
│       ├── middleware/       # Error handler, unreliable API simulator
│       └── types/            # Shared type definitions
├── frontend/                 # React + Vite + TanStack Query
│   └── src/
│       ├── api/              # Fetch client with AbortController
│       ├── components/       # UI components (tasks/, common/, ui/)
│       ├── hooks/            # useTasks, useTask, useTaskMutations, useDebouncedValue
│       ├── pages/            # TaskBoardPage
│       ├── types/            # Frontend type definitions
│       └── lib/              # QueryClient, utilities
└── tests/
    ├── backend/              # Supertest API tests
    └── frontend/             # React Testing Library tests
```

### Data Flow

```text
              ┌─────────────────┐
              │      CLIENT     │
              └────────┬────────┘
                       │
             Search / Mutation
                       │
           ┌───────────▼───────────┐
           │ Reliability Protection │
           │                       │
           │ Debounce              │
           │ AbortController       │
           │ Request ID            │
           │ Optimistic Update     │
           │ Rollback              │
           │ Idempotency Key       │
           └───────────┬───────────┘
                       │
                       ▼
              ┌─────────────────┐
              │      API        │
              ├─────────────────┤
              │ Random Latency  │
              │ Random 500      │
              │ Duplicate Req   │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ TASK SERVICE    │
              ├─────────────────┤
              │ Version Check   │
              │ Conflict → 409  │
              │ Idempotency     │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ TASK REPOSITORY │
              └─────────────────┘
```

## Stack

| Layer    | Technology                                                         |
| -------- | ------------------------------------------------------------------ |
| Frontend | React, TypeScript, Vite, TanStack Query, React Hook Form, Tailwind |
| Backend  | Node.js, Express, TypeScript, Zod                                  |
| Tests    | Vitest, React Testing Library, Supertest                           |
| Storage  | In-memory `Map<string, Task>`                                      |

---

## Answers to Required Questions

### 1. How do you prevent stale responses?

Three layers of protection:

1. **Debounce** (300ms) reduces unnecessary requests. The user's fast keystrokes (`r` → `re` → `rea` → `react`) collapse into a single API call for `"react"`.

2. **AbortController** cancels obsolete fetches. When a new search is initiated, `controller.abort()` cancels the previous in-flight request. TanStack Query does this automatically via the `queryFn` signal parameter.

3. **Stale entity version guard** via `structuralSharing`. Even if a cancelled request's response leaks through (some backends/proxies still deliver responses for aborted requests), the `structuralSharing` callback in `useTasks` compares each incoming task's `version` against the cached version. If the incoming version is lower, the cached (newer) version is preserved. This prevents an older response from overwriting newer data.

### 2. How do you detect conflicting task edits?

Every task has a monotonically increasing `version` number owned by the backend. The client sends the version it last observed with every PATCH request.

The backend algorithm:

```text
client version === server version?
  YES → apply mutation, version++, return updated task
  NO  → return 409 Conflict with the current server task
```

When the frontend receives a 409, it:

1. Rolls back the optimistic update
2. Shows a conflict banner: "This task was modified elsewhere"
3. Offers a "Load latest" button to fetch the current server state

This handles the two-browser-tab scenario: Tab A edits version 5 → succeeds → version 6. Tab B edits version 5 → gets 409.

### 3. What happens when a mutation succeeds but the client times out?

The client generates an `Idempotency-Key` for every mutation and sends it as a request header. The backend maintains a `Map<string, MutationResult>` cache.

On retry:

1. Client retries the PATCH with the **same** Idempotency-Key
2. Backend checks: "Have I processed this key before?"
3. If yes → returns the cached result (no duplicate mutation)
4. If no → processes the mutation normally

This means the mutation is applied exactly once regardless of how many times the request is retried. The client safely retries without risk of duplicate side effects.

### 4. Where do you put state? Why?

| State                 | Location                | Rationale                                                         |
| --------------------- | ----------------------- | ----------------------------------------------------------------- |
| Search query          | URL (`useSearchParams`) | Survives refresh, enables bookmarking and sharing                 |
| Status filter         | URL (`useSearchParams`) | Same                                                              |
| Priority filter       | URL (`useSearchParams`) | Same                                                              |
| Task list             | TanStack Query cache    | Server-owned data; automatic refetch, caching, invalidation       |
| Individual task       | TanStack Query cache    | Same; separate cache key `["task", id]`                           |
| Form values           | React Hook Form         | Ephemeral form state; preserves on validation failure             |
| Drawer/modal open     | `useState`              | Transient UI state with no persistence need                       |
| Loading/errors        | Query/mutation state    | Derived from TanStack Query status                                |
| Optimistic snapshot   | Mutation lifecycle      | `onMutate` snapshot → `onError` rollback → `onSettled` invalidate |
| Authoritative version | Backend only            | Clients never determine version; backend increments it            |

### 5. What fails first at 100,000 tasks?

At 100k tasks, multiple bottlenecks emerge simultaneously:

1. **Network payload**: Sending 100k JSON tasks (~5-10 MB) per request is too slow. Users on mobile or weak connections will timeout.

2. **DOM size**: Rendering 100k `<tr>` elements creates ~400k+ DOM nodes. Layout, paint, and composite become extremely expensive. The browser tab may become unresponsive.

3. **Client-side filtering**: `Array.filter()` over 100k objects on every keystroke is wasteful even with debouncing. The O(n) scan adds noticeable latency.

4. **Memory usage**: TanStack Query cache holding 100k task objects plus optimistic snapshots during mutations can consume significant memory.

5. **Query/cache size**: Cache invalidation and structural sharing comparisons become expensive over large datasets.

**Mitigation strategy:**

- **Server-side pagination** with cursor-based pagination (`?cursor=abc&limit=50`). Transfer only the visible window.
- **Server-side filtering and search**. Move `search`, `status`, and `priority` filtering to the backend (already implemented).
- **Indexed queries**. Replace the in-memory `Map` with a database with indexes on `status`, `priority`, and full-text search on `title`.
- **Virtualized rendering** (e.g., `@tanstack/react-virtual`). Render only the ~30 visible rows in the viewport.
- **Windowed cache**. Cache only the current page of results, not the entire dataset.

### 6. What shortcuts did you take? Would you change them?

1. **In-memory repository** instead of PostgreSQL/MongoDB. Persistent storage is not relevant to demonstrating race handling, optimistic updates, version conflicts, and idempotency. The in-memory `Map` lets us focus on the concurrency mechanics. In production, I'd use PostgreSQL with optimistic locking (`UPDATE ... WHERE version = $1`).

2. **No authentication or authorization**. The assignment focuses on data consistency, not access control. In production, every mutation would include auth context.

3. **No pagination**. With 15 seeded tasks and a 200-task ceiling, pagination adds complexity without demonstrating the race-condition concepts. For production, cursor-based pagination is essential.

4. **Idempotency key TTL is 1 hour in-memory**. In production, this would be stored in Redis with a configurable TTL and proper expiry policy.

5. **No WebSocket/SSE for real-time updates**. Two-tab conflict detection relies on version checking at mutation time rather than live push. For production, server-sent events would notify other tabs immediately when a task changes.

---

## Running Tests

```bash
# Backend tests (10 tests)
cd backend && npx vitest run

# Frontend tests (3 tests)
cd frontend && npx vitest run

# All tests
npm test
```

## API Endpoints

| Method | Endpoint                       | Description                |
| ------ | ------------------------------ | -------------------------- |
| GET    | `/api/tasks`                   | List tasks (search/filter) |
| GET    | `/api/tasks/:id`               | Get single task            |
| POST   | `/api/tasks`                   | Create task                |
| PATCH  | `/api/tasks/:id`               | Update task                |
| GET    | `/api/tasks/config/unreliable` | Get API sim config         |
| PATCH  | `/api/tasks/config/unreliable` | Update API sim config      |

### Key Headers

- `Idempotency-Key`: Unique request ID for safe mutation retries
- `Content-Type: application/json`

## Race Lab Control Panel

The bottom-right corner includes a dev-only panel for configuring the unreliable API simulator:

- **Stable**: Disables all chaos (instant, reliable responses)
- **Default**: 100-1800ms latency, 10% error rate, 5% duplicate rate
- **Chaos**: 500-3000ms latency, 30% error rate, 15% duplicate rate
