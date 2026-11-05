// How the account and recipe screens call our own API from the browser.

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string; status: number; fields?: Record<string, string[] | undefined> };

export async function callApi<T = unknown>(url: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const parsed = (await response.json().catch(() => null)) as { error?: { message?: string; fields?: Record<string, string[] | undefined> } } | null;
    if (response.ok) return { ok: true, data: parsed as T };
    return {
      ok: false,
      status: response.status,
      message: parsed?.error?.message ?? "Something went wrong on our side. Please try again.",
      fields: parsed?.error?.fields,
    };
  } catch {
    return { ok: false, status: 0, message: "We could not reach Nature Food. Please check your connection and try again." };
  }
}
