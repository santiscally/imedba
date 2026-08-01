import type {
  Collection, CollectionCreateRequest, CollectionSellRequest,
} from '../types/collection'
import type { BookSale } from '../types/book-sale'
import type { BusinessUnit } from '../types/course'
import { apiGet, apiPost, apiPut, apiDelete } from './client'

// Servicio de colecciones — refleja CollectionController (/api/v1/collections).
// El backend devuelve List<CollectionResponse> (no paginado), igual que diplomas.

export const collectionsApi = {
  /** `businessUnit` filtra por unidad e incluye las colecciones sin unidad asignada. */
  list(activeOnly?: boolean, businessUnit?: BusinessUnit): Promise<Collection[]> {
    const qp = new URLSearchParams()
    if (activeOnly)   qp.set('active', 'true')
    if (businessUnit) qp.set('businessUnit', businessUnit)
    const q = qp.toString()
    return apiGet<Collection[]>(`/collections${q ? `?${q}` : ''}`)
  },
  get(id: string): Promise<Collection> {
    return apiGet<Collection>(`/collections/${id}`)
  },
  create(body: CollectionCreateRequest): Promise<Collection> {
    return apiPost<Collection, CollectionCreateRequest>('/collections', body)
  },
  update(id: string, body: CollectionCreateRequest): Promise<Collection> {
    return apiPut<Collection, CollectionCreateRequest>(`/collections/${id}`, body)
  },
  remove(id: string): Promise<void> {
    return apiDelete(`/collections/${id}`)
  },
  // Vende la colección: genera una venta por libro (split por precio de lista).
  sell(id: string, body: CollectionSellRequest): Promise<BookSale[]> {
    return apiPost<BookSale[], CollectionSellRequest>(`/collections/${id}/sell`, body)
  },
}
