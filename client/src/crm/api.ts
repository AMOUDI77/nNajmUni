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

export async function upload<T>(path: string, data: FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/crm" + path), {
      method: "POST",
      body: data,
      credentials: "include",
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
    });
  } catch {
    throw new ApiError("Connection lost. Your recording is ready to retry.", 0);
  }
  const payload = await response
    .json()
    .catch(() => ({ error: "Unexpected server response" }));
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("crm:unauthorized"));
    throw new ApiError(payload.error || "The upload failed", response.status);
  }
  return payload as T;
}

export function uploadWithProgress<T>(
  path: string,
  data: FormData,
  onProgress: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", apiUrl("/api/crm" + path));
    request.withCredentials = true;
    if (csrf) request.setRequestHeader("X-CSRF-Token", csrf);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new ApiError("Connection lost. Your attachment is ready to retry.", 0));
    request.onload = () => {
      let payload: { error?: string } = {};
      try { payload = JSON.parse(request.responseText || "{}"); } catch { payload = { error: "Unexpected server response" }; }
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(payload as T);
      } else {
        if (request.status === 401) window.dispatchEvent(new Event("crm:unauthorized"));
        reject(new ApiError(payload.error || "The upload failed", request.status));
      }
    };
    request.send(data);
  });
}
