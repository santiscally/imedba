import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.collection.entity.CollectionVariant
export type CollectionVariant = 'TRADICIONAL' | 'ANILLADA'

export const COLLECTION_VARIANTS: CollectionVariant[] = ['TRADICIONAL', 'ANILLADA']

export const COLLECTION_VARIANT_LABELS: Record<CollectionVariant, string> = {
  TRADICIONAL: 'Tradicional',
  ANILLADA:    'Anillada',
}

// Resumen de libro embebido en la colección (CollectionResponse.BookSummary)
export interface CollectionBookSummary {
  id:        UUID
  name:      string
  code:      string | null
  salePrice: number | null
}

// Refleja com.imedba.modules.collection.dto.CollectionResponse
export interface Collection {
  id:                 UUID
  name:               string
  variant:            CollectionVariant
  price:              number
  studentDiscountPct: number
  active:             boolean
  books:              CollectionBookSummary[]
  createdAt:          Instant
  updatedAt:          Instant
}

// Refleja CollectionCreateRequest
export interface CollectionCreateRequest {
  name:                string
  variant:             CollectionVariant
  price:               number
  studentDiscountPct?: number | null
  active?:             boolean | null
  bookIds:             UUID[]
}

// Refleja CollectionSellRequest
export interface CollectionSellRequest {
  studentId?:           UUID | null
  enrollmentId?:        UUID | null
  applyStudentDiscount?: boolean | null
}
