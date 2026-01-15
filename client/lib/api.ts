export async function apiFetch(path: string, options: any = {}) {
  const base = (import.meta.env.VITE_API_BASE as string) || "";
  let url = path.startsWith("http") ? path : base + path;
  if (!path.startsWith("http") && base) {
    try {
      const baseUrl = base.endsWith("/") ? base.slice(0, -1) : base;
      const p = path.startsWith("/") ? path : `/${path}`;
      url = baseUrl + p;
    } catch {}
  }

  const timeout = options.timeout ?? 10000;

  try {
    console.debug("apiFetch ->", {
      url,
      options: { ...options, headers: undefined },
      timeout,
    });
  } catch {}

  const headers = new Headers(options.headers || {});
  if (!headers.has("Authorization")) {
    try {
      const token = localStorage.getItem("token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch {}
  }

  // XHR fallback implementation
  const doXhrFallback = async (
    fetchUrl: string,
    fetchOptions: any,
    fetchHeaders: Headers,
  ) => {
    return await new Promise<Response>((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open(fetchOptions?.method || "GET", fetchUrl, true);

        try {
          fetchHeaders.forEach((v, k) => xhr.setRequestHeader(k, v));
        } catch {}

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            const bodyText = xhr.responseText;
            const status = xhr.status || 0;
            const ok = status >= 200 && status < 300;
            const resLike: Partial<Response> = {
              ok,
              status,
              statusText: xhr.statusText,
              url: fetchUrl,
              text: async () => bodyText,
              json: async () => {
                try {
                  return JSON.parse(bodyText || "null");
                } catch (e) {
                  return {
                    success: false,
                    message: "Invalid JSON",
                    error: String(e),
                  };
                }
              },
            };
            resolve(resLike as Response);
          }
        };

        xhr.onerror = function () {
          const resLike: Partial<Response> = {
            ok: false,
            status: 0,
            text: async () => "Network error",
            json: async () => ({ success: false, message: "Network error" }),
          };
          resolve(resLike as Response);
        };

        try {
          if (fetchOptions?.body) xhr.send(fetchOptions.body);
          else xhr.send();
        } catch (e) {
          const resLike: Partial<Response> = {
            ok: false,
            status: 0,
            text: async () => String(e),
            json: async () => ({ success: false, message: String(e) }),
          };
          resolve(resLike as Response);
        }
      } catch (e) {
        const resLike: Partial<Response> = {
          ok: false,
          status: 0,
          text: async () => String(e),
          json: async () => ({ success: false, message: String(e) }),
        };
        resolve(resLike as Response);
      }
    });
  };

  // safe fetch wrapper that never throws
  const safeFetch = async (
    fetchUrl: string,
    fetchOptions: any,
    fetchHeaders: Headers,
  ) => {
    // Simplified and robust fetch wrapper: try fetch with await and fallback to XHR on any failure
    try {
      const resp = await (globalThis.fetch as typeof fetch)(fetchUrl, {
        ...fetchOptions,
        headers: fetchHeaders,
        mode: fetchOptions?.mode ?? "cors",
        credentials: fetchOptions?.credentials ?? "same-origin",
      } as RequestInit);
      return resp;
    } catch (err) {
      console.debug("fetch failed, falling back to XHR", { fetchUrl, err });
      try {
        const xr = await doXhrFallback(fetchUrl, fetchOptions, fetchHeaders);
        return xr;
      } catch (e) {
        console.debug("XHR fallback also failed", e);
        return {
          ok: false,
          status: 0,
          json: async () => ({
            success: false,
            message: "Network error",
            error: String(e),
          }),
          text: async () => String(e),
        } as unknown as Response;
      }
    }
  };

  // Implement timeout by racing safeFetch against a timer
  const makeFetch = async () => {
    try {
      let timedOut = false;
      const fetchPromise = safeFetch(url, { ...options }, headers);
      const timeoutPromise = new Promise<Response>((resolve) => {
        const t = setTimeout(() => {
          timedOut = true;
          resolve({
            ok: false,
            status: 0,
            json: async () => ({
              success: false,
              message: "Request aborted (timeout)",
            }),
            text: async () => "Request aborted (timeout)",
          } as unknown as Response);
        }, timeout);
        // clear timer if fetch resolves earlier
        fetchPromise.then(() => clearTimeout(t)).catch(() => clearTimeout(t));
      });

      const resp = await Promise.race([fetchPromise, timeoutPromise]);
      return resp;
    } catch (e: any) {
      return {
        ok: false,
        status: 0,
        json: async () => ({
          success: false,
          message: "Network error",
          error: String(e),
        }),
        text: async () => String(e),
      } as unknown as Response;
    }
  };

  try {
    const first = await makeFetch();
    if (first && (first as any).ok === false && (first as any).status === 0) {
      await new Promise((r) => setTimeout(r, 300));
      const second = await makeFetch();
      if (
        second &&
        (second as any).ok === false &&
        (second as any).status === 0
      ) {
        try {
          if (!path.startsWith("http") && url !== path) {
            console.debug("apiFetch: primary failed, trying relative path", {
              primary: url,
              fallback: path,
            });
            const fallbackUrl = path.startsWith("/") ? path : `/${path}`;
            try {
              const resp = await (globalThis.fetch as typeof fetch)(
                fallbackUrl,
                { ...options, headers },
              );
              return resp;
            } catch (e) {
              // try XHR fallback to relative path
              return await doXhrFallback(fallbackUrl, options, headers);
            }
          }
        } catch (e) {
          // ignore and fall through
        }
      }
      return second;
    }
    return first;
  } catch (e: any) {
    console.debug("apiFetch failed for url", url, e?.message || e);
    return {
      ok: false,
      status: 0,
      json: async () => ({
        success: false,
        message: "Network error",
        error: String(e),
      }),
      text: async () => String(e),
    } as unknown as Response;
  }
}
