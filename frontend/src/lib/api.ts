// ============================================================
// frontend/src/lib/api.ts
// Centralized Authenticated API Client for KisanSarthi
// ============================================================
// Handles communication between the frontend and the Express backend.
// - Resolves the configured VITE_API_URL (defaults to http://localhost:5000/api)
// - Automatically retrieves and attaches the Supabase JWT Bearer token
// - Handles JSON parsing, network errors, and structured API error responses
// - Supports both JSON and multipart/form-data uploads
// - Never sets manual multipart boundaries or logs authentication secrets
// ============================================================

import { supabase } from '@/integrations/supabase/client';

function resolveApiBaseUrl(): string {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.['VITE_API_URL']) ||
    'https://kisan-sarthi-ananyarastogi9259-progs-projects.vercel.app/api';

  return envUrl
    .replace(/kisan-sarthi-[a-z0-9]+-ananyarastogi/i, 'kisan-sarthi-ananyarastogi')
    .replace(/\/+$/, '');
}

const API_BASE_URL = resolveApiBaseUrl();

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  requiresAuth?: boolean;
  body?: unknown;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  [key: string]: unknown;
}

export class ApiClientError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Retrieves the current valid Supabase session access token.
 * Returns null if not authenticated or session has expired.
 * Never logs or exposes the token value.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.access_token) {
      return null;
    }
    const expiresAt = data.session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now() + 60000) {
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshData?.session?.access_token) {
        return refreshData.session.access_token;
      }
    }
    return data.session.access_token;
  } catch {
    return null;
  }
}

/**
 * Core fetch wrapper that coordinates auth, headers, payload serializing,
 * and structured error handling.
 */
async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    params,
    requiresAuth = true,
    headers: customHeaders,
    body,
    ...fetchOptions
  } = options;

  // Build full target URL with query params
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${API_BASE_URL}${cleanEndpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, String(val));
      }
    });
  }

  const headers = new Headers(customHeaders);

  // Attach Supabase access token when required or available
  if (requiresAuth) {
    const token = await getAccessToken();
    if (!token) {
      throw new ApiClientError(
        'Authentication required. Please log in to continue.',
        401
      );
    }
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    // Optional auth: attach token if farmer is already logged in
    const token = await getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Handle request payload
  let finalBody: BodyInit | undefined = undefined;

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      // For multipart/form-data, do NOT set Content-Type header.
      // The browser automatically sets Content-Type with proper boundary.
      headers.delete('Content-Type');
      finalBody = body;
    } else if (
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      typeof body === 'string'
    ) {
      finalBody = body as BodyInit;
    } else {
      // Default to JSON serialization
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      finalBody = JSON.stringify(body);
    }
  }

  try {
    const fetchInit: RequestInit = {
      ...fetchOptions,
      headers,
    };
    if (finalBody !== undefined) {
      fetchInit.body = finalBody;
    }
    const response = await fetch(url.toString(), fetchInit);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const parsedData = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      if (response.status === 401 && requiresAuth) {
        try {
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshData?.session?.access_token) {
            headers.set('Authorization', `Bearer ${refreshData.session.access_token}`);
            const retryRes = await fetch(url.toString(), { ...fetchInit, headers });
            const retryContentType = retryRes.headers.get('content-type') || '';
            const isRetryJson = retryContentType.includes('application/json');
            const retryParsed = isRetryJson ? await retryRes.json() : await retryRes.text();
            if (retryRes.ok) {
              return retryParsed as T;
            }
          }
        } catch {
          // ignore and fall through to standard error
        }
      }

      const errorMessage =
        (typeof parsedData === 'object' && parsedData !== null && 'message' in parsedData
          ? String(parsedData.message)
          : '') ||
        (typeof parsedData === 'object' && parsedData !== null && 'error' in parsedData
          ? String(parsedData.error)
          : '') ||
        `Request failed with status ${response.status}`;

      throw new ApiClientError(errorMessage, response.status, parsedData);
    }

    return parsedData as T;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiClientError(message, 0, null);
  }
}

/**
 * Convenience API helper methods
 */
export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  /**
   * Upload file or form data without setting explicit Content-Type headers
   */
  upload: <T = unknown>(endpoint: string, formData: FormData, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body: formData }),

  /**
   * Health check utility (unauthenticated)
   */
  health: () => request('/health', { requiresAuth: false }),
};

export default api;
