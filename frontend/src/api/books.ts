import type { PageResponse } from '../types/common'
import type {
  Book, BookCreateRequest, BookUpdateRequest, BookAuthorRequest,
} from '../types/book'
import { apiGet, apiPost, apiPut, apiDelete } from './client'

// Servicio de libros — refleja BookController (/api/v1/books).

export interface ListBooksParams {
  q?:         string
  specialty?: string
  branch?:    string
  active?:    boolean
  page?:      number
  size?:      number
  sort?:      string        // ej: "name,asc"
}

function buildQuery(params: ListBooksParams): string {
  const qp = new URLSearchParams()
  if (params.q)                    qp.set('q',         params.q)
  if (params.specialty)            qp.set('specialty', params.specialty)
  if (params.branch)               qp.set('branch',    params.branch)
  if (params.active !== undefined) qp.set('active',    String(params.active))
  if (params.page   !== undefined) qp.set('page',      String(params.page))
  if (params.size   !== undefined) qp.set('size',      String(params.size))
  if (params.sort)                 qp.set('sort',      params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const booksApi = {
  list(params: ListBooksParams = {}): Promise<PageResponse<Book>> {
    return apiGet<PageResponse<Book>>(`/books${buildQuery(params)}`)
  },
  get(id: string): Promise<Book> {
    return apiGet<Book>(`/books/${id}`)
  },
  create(body: BookCreateRequest): Promise<Book> {
    return apiPost<Book, BookCreateRequest>('/books', body)
  },
  update(id: string, body: BookUpdateRequest): Promise<Book> {
    return apiPut<Book, BookUpdateRequest>(`/books/${id}`, body)
  },
  deactivate(id: string): Promise<void> {
    return apiPut<void, undefined>(`/books/${id}/deactivate`, undefined)
  },
  // Gestión de autores del libro — devuelven el Book actualizado.
  addAuthor(id: string, body: BookAuthorRequest): Promise<Book> {
    return apiPost<Book, BookAuthorRequest>(`/books/${id}/authors`, body)
  },
  removeAuthor(id: string, authorId: string): Promise<void> {
    return apiDelete(`/books/${id}/authors/${authorId}`)
  },
}
