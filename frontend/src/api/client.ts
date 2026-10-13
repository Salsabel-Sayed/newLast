const API_BASE_URL = (
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:5000/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

interface ApiErrorBody {
  success: false;
  message: string;
}

const DEFAULT_ERROR_MESSAGE = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("تعذر الاتصال بالخادم، تحقق من اتصالك بالشبكة", 0);
  }

  let body: ApiSuccessBody<T> | ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody;
  } catch {
    body = null;
  }

  if (!body || !res.ok || !body.success) {
    const message = body && !body.success ? body.message : DEFAULT_ERROR_MESSAGE;
    throw new ApiError(message, res.status);
  }

  return body.data;
}

function toQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return "";
  const search = new URLSearchParams();
  for (const [key, value] of entries) {
    search.set(key, String(value));
  }
  return `?${search.toString()}`;
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(`${path}${toQueryString(params)}`, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
