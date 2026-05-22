import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.book.dto.BookAuthorResponse
export interface BookAuthor {
  authorId:          UUID
  firstName:         string
  lastName:          string
  royaltyPercentage: number   // 0–100
}

// Refleja com.imedba.modules.book.dto.BookResponse
export interface Book {
  id:                 UUID
  name:               string
  code:               string | null
  specialty:          string | null
  format:             string | null
  edition:            string | null
  pages:              number | null
  salePrice:          number          // requerido, ≥ 0
  studentDiscountPct: number | null   // % off alumnos
  costPerUnit:        number | null
  stockQuantity:      number | null
  branch:             string | null
  active:             boolean
  authors:            BookAuthor[]
  createdAt:          Instant
  updatedAt:          Instant
}

// Refleja BookAuthorRequest
export interface BookAuthorRequest {
  authorId:          UUID
  royaltyPercentage: number   // 0–100
}

// Refleja BookCreateRequest
export interface BookCreateRequest {
  name:                string                 // required, max 255
  code?:               string | null          // max 50
  specialty?:          string | null          // max 100
  format?:             string | null          // max 50
  edition?:            string | null          // max 50
  pages?:              number | null          // ≥ 0
  salePrice:           number                 // required, ≥ 0
  studentDiscountPct?: number | null          // ≥ 0
  costPerUnit?:        number | null          // ≥ 0
  stockQuantity?:      number | null          // ≥ 0
  branch?:             string | null          // max 50
  authors?:            BookAuthorRequest[]
}

// Refleja BookUpdateRequest (sin authors — se gestionan por endpoints aparte)
export interface BookUpdateRequest {
  name?:               string
  code?:               string | null
  specialty?:          string | null
  format?:             string | null
  edition?:            string | null
  pages?:              number | null
  salePrice?:          number
  studentDiscountPct?: number | null
  costPerUnit?:        number | null
  stockQuantity?:      number | null
  branch?:             string | null
  active?:             boolean
}
