import type { Instant, UUID } from './common'
import type { PaymentMethod } from './enrollment'

export { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from './enrollment'
export type { PaymentMethod } from './enrollment'

// Resumen del enrollment embebido en el response.
export interface PaymentEnrollmentSummary {
  id:               UUID
  studentId:        UUID
  studentFirstName: string
  studentLastName:  string
  courseId:         UUID
  courseName:       string
}

// Refleja com.imedba.modules.payment.dto.PaymentResponse
export interface Payment {
  id:             UUID
  enrollment:     PaymentEnrollmentSummary
  installmentId:  UUID | null              // null si es pago suelto (matrícula, libro)
  installmentNumber: number | null
  receiptNumber:  string                   // IMD-YYYYMMDD-XXXXXX (server-side)
  paymentMethod:  PaymentMethod
  amount:         number
  paymentDate:    string                   // LocalDate YYYY-MM-DD
  notes:          string | null
  createdAt:      Instant
}

// Refleja com.imedba.modules.payment.dto.PaymentCreateRequest
export interface PaymentCreateRequest {
  installmentId?: UUID | null
  enrollmentId?:  UUID | null    // si no hay installmentId, va el enrollment
  amount:         number
  paymentMethod:  PaymentMethod
  paymentDate?:   string | null
  notes?:         string | null
}
