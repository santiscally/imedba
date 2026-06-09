import { getAccessToken } from '../lib/auth'

// Fuente de verdad: VITE_API_BASE_URL (la que inyecta docker-compose/Dockerfile).
// Mantenemos VITE_API_URL como fallback por compatibilidad con .env locales viejos.
// Normalizamos para que SIEMPRE termine en /api/v1 sin importar el formato que
// venga: el contenedor inyecta el origen pelado (http://localhost:8080) en dev y
// `/api` en prod — antes el código leía otra var y caía a un default => POST al
// nginx del SPA => 405. Esta normalización cierra ese gap.
function resolveApiBase(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL
    ?? import.meta.env.VITE_API_URL
    ?? '/api') as string
  const trimmed = raw.replace(/\/+$/, '')
  if (trimmed.endsWith('/api/v1')) return trimmed
  if (trimmed.endsWith('/api'))    return `${trimmed}/v1`
  return `${trimmed}/api/v1`
}

const BASE_URL = resolveApiBase()

export interface ApiFieldError { field: string; message: string }

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,                  // ej. CONFLICT, VALIDATION_ERROR, NOT_FOUND
    public fieldErrors?: ApiFieldError[],   // de validaciones de campos
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Lee el body de error uniforme del backend (com.imedba.common.error.ApiError):
// { timestamp, status, error, message, path, errors[] } y arma un ApiError con el
// `message` real, así los forms muestran "El alumno ya tiene una inscripción activa…"
// en vez de un "HTTP 409" opaco.
async function toApiError(response: Response): Promise<ApiError> {
  let message = `HTTP ${response.status}`
  let code: string | undefined
  let fieldErrors: ApiFieldError[] | undefined
  try {
    const body = await response.json()
    if (body && typeof body === 'object') {
      if (typeof body.message === 'string' && body.message.trim()) message = body.message
      if (typeof body.error === 'string') code = body.error
      if (Array.isArray(body.errors) && body.errors.length > 0) {
        fieldErrors = body.errors as ApiFieldError[]
        // si no vino message útil, armarlo a partir de los errores de campo
        if (message === `HTTP ${response.status}`) {
          message = fieldErrors.map(e => `${e.field}: ${e.message}`).join(' · ')
        }
      }
    }
  } catch {
    // sin body JSON (ej. 401/403/502) → queda el "HTTP NNN"
  }
  return new ApiError(message, response.status, code, fieldErrors)
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {}
  if (token)              headers['Authorization'] = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type']  = 'application/json'

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })
  if (!response.ok) throw await toApiError(response)
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
