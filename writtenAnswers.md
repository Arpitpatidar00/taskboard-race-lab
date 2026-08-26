# Written Test - Fullstack (Frontend) Answers

## Q1: React State Immutability

```typescript
type Item = { id: number; selected: boolean };
const [items, setItems] = useState<Item[]>(initialItems);
function selectItem(id: number) {
  const next = [...items];
  const item = next.find((x) => x.id === id);
  if (item) {
    item.selected = true;
  }
  setItems(next);
}
```

**1. Is this update fully immutable?**
No, it is not. While `const next = [...items]` creates a shallow copy of the array itself, the objects inside the array are still the exact same references. Modifying `item.selected = true` directly mutates the existing object in memory.

**2. What object references changed and what references did not?**

- **Changed:** The array reference itself changed (since `next` is a new array).
- **Did not change:** The reference to the modified `item` object did not change. The references to all other objects in the array also did not change.

**3. Give one situation where this implementation could still cause a bug.**
If a child component receives the `item` as a prop and is optimized with `React.memo` (or `PureComponent`), it will not re-render. `React.memo` does a shallow comparison of props, and since the `item` reference hasn't changed, it assumes the prop is identical and skips rendering the new `selected` state.

**4. Rewrite it.**

```typescript
function selectItem(id: number) {
  setItems((prevItems) =>
    prevItems.map((item) =>
      item.id === id ? { ...item, selected: true } : item,
    ),
  );
}
```

---

## Q2: Data Fetching Race Conditions

```typescript
useEffect(() => {
  const timer = setTimeout(async () => {
    const response = await fetch(`/api/search?q=${query}`);
    const data = await response.json();
    setResults(data);
  }, 300);
  return () => clearTimeout(timer);
}, [query]);
```

**1. Describe a concrete request ordering that still produces incorrect UI.**

1. The user types `"A"` and stops. After 300ms, Request 1 (`?q=A`) fires.
2. The user then quickly types `"B"` (making the input `"AB"`) and stops. After another 300ms, Request 2 (`?q=AB`) fires.
3. Request 2 is fast and resolves first. The UI updates to show results for `"AB"`.
4. Request 1 is slow and resolves _after_ Request 2. The UI updates to show results for `"A"`.
   _Result:_ The user's input is `"AB"`, but the UI is displaying results for `"A"`.

**2. Fix the correctness issue without removing debounce.**
We can use a boolean flag in the effect closure to ignore stale responses.

```typescript
useEffect(() => {
  let ignore = false;
  const timer = setTimeout(async () => {
    const response = await fetch(`/api/search?q=${query}`);
    const data = await response.json();
    if (!ignore) {
      setResults(data);
    }
  }, 300);

  return () => {
    clearTimeout(timer);
    ignore = true; // Mark this effect run as stale
  };
}, [query]);
```

_(Alternatively, use an `AbortController` inside the `setTimeout` and call `abort()` in the cleanup function)._

**3. What would you do if the backend does not support request cancellation?**
The solution in question #2 (the boolean `ignore` flag) is exactly what you do. Even if you use `AbortController`, the browser might sever the connection but the backend might still process it. From the frontend's perspective, request cancellation is primarily about _ignoring the response_ so it doesn't pollute the UI state. The `ignore` flag guarantees the UI state won't update from a stale request, regardless of backend support.

---

## Q3: Memoization and Performance

```typescript
A page renders 200 products.
const visibleProducts = useMemo(
  () => products.filter((p) => p.name.includes(search)),
  [products, search]
);
```

**1. Why can memoization fail to help?**
`useMemo` has an overhead: React must allocate memory to store the cached value and perform dependency array comparisons on every render. For a simple operation like filtering 200 items, standard JavaScript array methods execute in less than a millisecond. The overhead of `useMemo` can actually be slower than just running the filter on every render.

**2. What would you measure before using it?**
You should measure the actual render time using the **React Profiler** (in React DevTools). You need to prove that the filtering operation itself is causing a noticeable bottleneck (jank or slow renders) before wrapping it in `useMemo`.

**3. Name two situations where memoization can increase cost or complexity.**

1. **Memoizing cheap primitives/operations:** Wrapping simple math or small array operations adds memory overhead and dependency checking without saving meaningful execution time.
2. **Unstable dependencies:** If you pass an inline object or function (that isn't itself memoized) into the dependency array of `useMemo`, it will break the cache on every single render. You pay the cost of recalculation _plus_ the overhead of `useMemo`.

**4. For 50,000 rows, what would you investigate before adding more memoization?**
Filtering 50,000 rows might take a few milliseconds, but **rendering 50,000 DOM nodes** will completely freeze the browser. Before adding more memoization, I would investigate:

- **UI Virtualization/Windowing** (e.g., `@tanstack/react-virtual` or `react-window`) so only the ~20 rows currently visible on screen are rendered.
- **Server-side filtering/pagination** so the client doesn't have to hold or filter 50,000 records in memory in the first place.
- **Web Workers** if heavy client-side processing is absolutely mandatory, to keep the main UI thread unblocked.

---

## Q4: Pagination

**API:** `GET /api/posts?page=3&size=20`

**1. Why can page/offset pagination behave like this?**
Offset pagination skips a fixed number of rows (`page * size`). In a highly dynamic dataset where new posts are constantly inserted at the top (since it's sorted by `createdAt desc`), the offsets shift.

- If 5 new posts are added while a user is on Page 1, the 5 oldest posts on Page 1 are pushed down to Page 2. When the user clicks "Page 2", they will see those 5 posts again as duplicates.
- Conversely, if posts are deleted, items shift up, and skipping offsets can cause posts to be skipped entirely.

**2. What alternative pagination strategy would you use?**
**Cursor-based pagination** (e.g., `GET /api/posts?cursor=xyz&limit=20`). Instead of saying "skip 40 items", you say "give me 20 items that come immediately after this specific item."

**3. What field(s) should the cursor contain if createdAt is not unique?**
The cursor must be unique and deterministic. If `createdAt` can be identical for multiple posts, the cursor should be a composite of the sort field and a unique tie-breaker, such as `(createdAt, id)`.
Example: `?cursor_date=2024-01-01T12:00:00Z&cursor_id=987` or a base64 encoded string combining both.
