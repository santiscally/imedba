import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.booksale.dto.BookSaleResponse
// Append-only: no hay update ni delete.
export interface BookSale {
  id:           UUID
  bookId:       UUID
  bookName:     string | null
  studentId:    UUID | null
  enrollmentId: UUID | null
  quantity:     number
  unitPrice:    number
  studentSale:  boolean        // true si se aplicó el descuento de alumno
  totalAmount:  number
  saleDate:     Instant
  soldBy:       UUID | null
  notes:        string | null
  createdAt:    Instant
}

// Refleja BookSaleCreateRequest
export interface BookSaleCreateRequest {
  bookId:               UUID
  studentId?:           UUID | null
  enrollmentId?:        UUID | null
  quantity:             number          // ≥ 1
  applyStudentDiscount?: boolean | null // aplica el descuento de alumno al precio base
  discountPercentage?:  number | null   // % explícito (promo/manual); >0 pisa el de alumno
  notes?:               string | null
}

// Refleja com.imedba.modules.booksale.dto.RoyaltyLineResponse
// Línea de royalties calculada on-the-fly por (libro, autor) en un período.
// royaltyAmount = totalSales × (royaltyPoolPct/100) × (royaltyPercentage/100).
// El pool del libro (default 10% de la venta) se reparte entre autoras según %.
export interface RoyaltyLine {
  authorId:          UUID
  firstName:         string
  lastName:          string
  bookId:            UUID
  bookName:          string | null
  royaltyPercentage: number
  royaltyPoolPct:    number
  totalSales:        number
  royaltyAmount:     number
}
