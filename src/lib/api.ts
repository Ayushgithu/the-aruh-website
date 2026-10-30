/* Browser helpers for talking to our own API routes. */

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown> = {}) { super(message); }
}

export async function request<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Could not reach the server. Check your internet connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? "Something went wrong.", res.status, data as Record<string, unknown>);
  return data as T;
}

export const postJson = <T = unknown>(url: string, body: unknown, method = "POST") =>
  request<T>(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const submitContact = (data: { name: string; phone: string; message: string }) => postJson("/api/contact", data);

export function submitSellRequest(data: Record<string, string>, photos: File[]) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  photos.forEach((f) => fd.append("photos", f));
  return request("/api/sell", { method: "POST", body: fd });
}

export async function uploadImages(files: File[]): Promise<string[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  const { urls } = await request<{ urls: string[] }>("/api/admin/upload", { method: "POST", body: fd });
  return urls;
}
