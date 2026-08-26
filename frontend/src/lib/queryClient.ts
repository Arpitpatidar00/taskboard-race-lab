import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0, // Don't auto-retry mutations — we handle retries with idempotency keys
    },
  },
});
