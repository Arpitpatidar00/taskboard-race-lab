import axios, { AxiosError } from "axios";

// Custom error class matching the backend's error schema
export class ApiRequestError extends Error {
  public code?: string;
  public details?: any;
  public currentTask?: any;

  constructor(message: string, public status: number, data?: any) {
    super(message);
    this.name = "ApiRequestError";
    if (data?.error) {
      this.code = data.error.code;
      this.details = data.error.details;
      this.currentTask = data.error.currentTask;
    }
  }
}

export const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === "test" ? "http://localhost/api" : "/api",
  adapter: "fetch", // Use fetch so global fetch mocks in tests work
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = (data as any)?.error?.message || error.message;
      throw new ApiRequestError(message, status, data);
    } else if (error.request) {
      throw new Error("No response received from the server. Please check your connection.");
    }
    throw error;
  }
);

// Helper wrapper for the old apiRequest API
export async function apiRequest<T>(
  endpoint: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  const { method = "GET", body, headers } = options;

  const response = await apiClient.request<T>({
    url: endpoint,
    method,
    data: body,
    headers,
  });

  return response.data;
}
