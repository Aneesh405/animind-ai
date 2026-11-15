const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "")
).replace(/\/$/, "");

export async function api<T>(path: string, body?: unknown): Promise<T> {
  if (!API_URL) {
    throw new Error(
      "The production learning engine URL is not configured. Add NEXT_PUBLIC_API_URL and redeploy AniMind.",
    );
  }
  const started = performance.now();
  const timing = process.env.NODE_ENV === "development" && path === "/api/lesson";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 55000);
  try {
    const isFile = body instanceof FormData;
    const response = await fetch(`${API_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined || isFile
          ? undefined
          : { "Content-Type": "application/json" },
      body:
        body === undefined ? undefined : isFile ? body : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const received = performance.now();
    const data = await response.json().catch(() => null);
    if (timing) {
      // Fixed labels only: never put prompts, document text or session IDs in diagnostics.
      performance.measure("animind:lesson-request", { start: started, end: received });
      performance.measure("animind:lesson-decode", { start: received, end: performance.now() });
    }
    if (!response.ok) {
      const detail = data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : typeof detail?.message === "string"
            ? detail.message
            : Array.isArray(detail)
              ? detail.map((item: { msg: string }) => item.msg).join(". ")
              : `The learning engine returned an error (${response.status}). Please try again.`;
      throw new Error(message);
    }
    if (data === null) {
      throw new Error(
        "The learning engine returned an unreadable response. Please try again.",
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "The request timed out. Your input is preserved. Reopen the lesson from Recent lessons before retrying.",
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Couldn't reach the learning engine. Start the backend on port 8000, then try again.",
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
