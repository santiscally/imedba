import type { PageResponse } from '../types/common'
import type { Author, AuthorCreateRequest, AuthorUpdateRequest } from '../types/author'
import { apiGet, apiPost, apiPut } from './client'

// Servicio de autores — refleja AuthorController (/api/v1/authors).
// El backend solo pagina/ordena (sin q/active server-side). `q`/`active` los
// usa el mock y Spring los ignora.

export interface ListAuthorsParams {
  q?:      string       // mock-only
  active?: boolean       // mock-only
  page?:   number
  size?:   number
  sort?:   string        // ej: "lastName,asc"
}

function buildQuery(params: ListAuthorsParams): string {
  const qp = new URLSearchParams()
  if (params.q)                    qp.set('q',      params.q)
  if (params.active !== undefined) qp.set('active', String(params.active))
  if (params.page   !== undefined) qp.set('page',   String(params.page))
  if (params.size   !== undefined) qp.set('size',   String(params.size))
  if (params.sort)                 qp.set('sort',   params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const authorsApi = {
  list(params: ListAuthorsParams = {}): Promise<PageResponse<Author>> {
    return apiGet<PageResponse<Author>>(`/authors${buildQuery(params)}`)
  },
  get(id: string): Promise<Author> {
    return apiGet<Author>(`/authors/${id}`)
  },
  create(body: AuthorCreateRequest): Promise<Author> {
    return apiPost<Author, AuthorCreateRequest>('/authors', body)
  },
  update(id: string, body: AuthorUpdateRequest): Promise<Author> {
    return apiPut<Author, AuthorUpdateRequest>(`/authors/${id}`, body)
  },
  // Soft delete.
  deactivate(id: string): Promise<void> {
    return apiPut<void, undefined>(`/authors/${id}/deactivate`, undefined)
  },
}
