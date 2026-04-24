import { mockFetch } from './mock/handlers'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  if (USE_MOCK) return mockFetch<T>(method, path, body)

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body:    body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })
  if (!response.ok) throw new ApiError(`HTTP ${response.status}`, response.status)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>('GET', path, undefined, signal)
}

export function apiPost<T, B = unknown>(path: string, body: B): Promise<T> {
  return request<T>('POST', path, body)
}

export function apiPut<T, B = unknown>(path: string, body: B): Promise<T> {
  return request<T>('PUT', path, body)
}

export function apiDelete(path: string): Promise<void> {
  return request<void>('DELETE', path)
}
