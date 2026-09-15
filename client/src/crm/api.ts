import { apiUrl } from "../config";
let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function crmApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/crm" + path), {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Connection lost. Your changes have not been saved.", 0);
  }
  const data = await response
    .json()
    .catch(() => ({ error: "Unexpected server response" }));
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("crm:unauthorized"));
    throw new ApiError(data.error || "The request failed", response.status);
  }
  return data as T;
}
export function write<T>(path: string, data: unknown, method = "POST") {
  return crmApi<T>(path, { method, body: JSON.stringify(data) });
}
