const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5000/api";
const apiUrl = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;
const tokenKey = "mindstorm_token";

export const getApiUrl = () => apiUrl;

export const getToken = () => localStorage.getItem(tokenKey);

export const setToken = (token?: string | null) => {
  if (!token) {
    localStorage.removeItem(tokenKey);
    return;
  }
  localStorage.setItem(tokenKey, token);
};

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const url = `${apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = "Request failed.";
    let bodyText = "";
    try {
      bodyText = await response.text();
      const payload = bodyText ? JSON.parse(bodyText) : null;
      if (payload && typeof payload === "object" && "message" in payload) {
        message = (payload as { message?: string }).message || message;
      } else if (bodyText) {
        message = bodyText;
      }
    } catch {
      if (bodyText) message = bodyText;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};
