"use client";

/**
 * A thin wrapper around the Fetch API that provides a typed interface for
 * performing HTTP requests.  The intent of this helper is to centralise
 * error handling and JSON parsing so that callers do not repeatedly
 * implement the same boilerplate.  If the response cannot be parsed as
 * JSON an exception will be thrown.  Callers should catch errors at
 * appropriate levels.
 */
export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    let message = res.statusText;
    try {
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        // If the server responded with an error message include it
        if (typeof data?.message === "string") message = data.message;
      }
    } catch {
      // Ignore JSON parse errors; fall back to status text
    }
    throw new Error(`HTTP ${res.status}: ${message}`);
  }
  // Assume JSON by default.  If another type is expected the caller should
  // supply appropriate response handling.
  return (await res.json()) as T;
}

/**
 * Issue a GET request and return the parsed JSON response.  If the
 * request fails or the response is not JSON a rejected promise is
 * returned.
 */
export async function get<T>(url: string, init: RequestInit = {}): Promise<T> {
  return request<T>(url, { ...init, method: "GET" });
}

/**
 * Issue a POST request.  The body can be any of the types accepted by
 * Fetch; callers may supply their own headers.  The response will be
 * parsed as JSON.
 */
export async function post<T>(url: string, body: BodyInit, headers: Record<string, string> = {}): Promise<T> {
  const init: RequestInit = {
    method: "POST",
    body,
    headers,
  };
  return request<T>(url, init);
}