import type { PageResponse } from '../types/common'
import type { BookSale, BookSaleCreateRequest, RoyaltyLine } from '../types/book-sale'
import { apiGet, apiPost } from './client'

// Servicio de ventas de libros — refleja BookSaleController (/api/v1/book-sales).
// Append-only (sin update / delete).

export interface ListBookSalesParams {
  q?:           string       // no soportado por el backend (ignorado)
  bookId?:      string
  studentId?:   string
  enrollmentId?: string
  soldBy?:      string
  from?:        string        // Instant ISO
  to?:          string        // Instant ISO
  page?:        number
  size?:        number
  sort?:        string        // ej: "saleDate,desc"
}

function buildQuery(params: ListBookSalesParams): string {
  const qp = new URLSearchParams()
  if (params.q)                  qp.set('q',            params.q)
  if (params.bookId)             qp.set('bookId',       params.bookId)
  if (params.studentId)          qp.set('studentId',    params.studentId)
  if (params.enrollmentId)       qp.set('enrollmentId', params.enrollmentId)
  if (params.soldBy)             qp.set('soldBy',       params.soldBy)
  if (params.from)               qp.set('from',         params.from)
  if (params.to)                 qp.set('to',           params.to)
  if (params.page !== undefined) qp.set('page',         String(params.page))
  if (params.size !== undefined) qp.set('size',         String(params.size))
  if (params.sort)               qp.set('sort',         params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const bookSalesApi = {
  list(params: ListBookSalesParams = {}): Promise<PageResponse<BookSale>> {
    return apiGet<PageResponse<BookSale>>(`/book-sales${buildQuery(params)}`)
  },
  get(id: string): Promise<BookSale> {
    return apiGet<BookSale>(`/book-sales/${id}`)
  },
  create(body: BookSaleCreateRequest): Promise<BookSale> {
    return apiPost<BookSale, BookSaleCreateRequest>('/book-sales', body)
  },
  royaltiesByPeriod(year: number, month: number): Promise<RoyaltyLine[]> {
    return apiGet<RoyaltyLine[]>(`/book-sales/royalties/by-period?year=${year}&month=${month}`)
  },
}
