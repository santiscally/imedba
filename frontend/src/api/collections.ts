import type {
  Collection, CollectionCreateRequest, CollectionSellRequest,
} from '../types/collection'
import type { BookSale } from '../types/book-sale'
import { apiGet, apiPost, apiPut, apiDelete } from './client'

// Servicio de colecciones — refleja CollectionController (/api/v1/collections).
// El backend devuelve List<CollectionResponse> (no paginado), igual que diplomas.

export const collectionsApi = {
  list(activeOnly?: boolean): Promise<Collection[]> {
    const q = activeOnly ? '?active=true' : ''
    return apiGet<Collection[]>(`/collections${q}`)
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
