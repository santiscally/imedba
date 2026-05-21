import type { Instant, UUID } from './common'
import type { PaymentMethod } from './enrollment'

export { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from './enrollment'
export type { PaymentMethod } from './enrollment'

// Refleja com.imedba.modules.payment.dto.PaymentResponse
// Plano: solo installmentId / enrollmentId. Alumno/curso se resuelven aparte.
export interface Payment {
  id:               UUID
  installmentId:    UUID | null      // null si es pago suelto (matrícula, libro, ajuste)
  enrollmentId:     UUID
  amount:           number
  paymentMethod:    PaymentMethod
  paymentDate:      Instant          // Instant (timestamp), no LocalDate
  referenceNumber:  string | null
  receiptNumber:    string | null    // IMD-... (server-side)
  receiptFilePath:  string | null
  receiptSentAt:    Instant | null
  notes:            string | null
  registeredBy:     UUID | null
  createdAt:        Instant
}

// Refleja com.imedba.modules.payment.dto.PaymentCreateRequest
export interface PaymentCreateRequest {
  installmentId?:   UUID | null      // obligatorio para pago imputado a cuota
  enrollmentId?:    UUID | null      // obligatorio si NO hay installmentId
  amount:           number           // > 0.01
  paymentMethod:    PaymentMethod
  paymentDate?:     Instant | null
  referenceNumber?: string | null
  receiptFilePath?: string | null
  notes?:           string | null
}
