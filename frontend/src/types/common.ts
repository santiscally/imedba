// Envelope de paginación que devuelve el backend (com.imedba.common.dto.PageResponse)
export interface PageResponse<T> {
  content:       T[]
  page:          number
  size:          number
  totalElements: number
  totalPages:    number
  first:         boolean
  last:          boolean
}

// Parámetros estándar de paginación/ordenamiento
export interface PageParams {
  page?: number
  size?: number
  sort?: string   // ej: "createdAt,desc"
}

// UUID de backend como string
export type UUID = string

// Instant ISO-8601 del backend
export type Instant = string
