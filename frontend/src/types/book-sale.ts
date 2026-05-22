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
  applyStudentDiscount?: boolean | null // aplica el descuento al precio base
  notes?:               string | null
}

// Refleja com.imedba.modules.booksale.dto.RoyaltyLineResponse
// Línea de royalties calculada on-the-fly por (libro, autor) en un período.
export interface RoyaltyLine {
  authorId:          UUID
  firstName:         string
  lastName:          string
  bookId:            UUID
  bookName:          string | null
  royaltyPercentage: number
  totalSales:        number   // suma de total_amount de las ventas del libro en el período
  royaltyAmount:     number   // total_amount * royalty_percentage
}
