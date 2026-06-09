import type { Instant, UUID } from './common'
import type { PaymentGroup } from './enrollment'

// Refleja com.imedba.modules.installment.entity.InstallmentStatus
export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE'

export const INSTALLMENT_STATUSES: InstallmentStatus[] = [
  'PENDING',
  'PAID',
  'OVERDUE',
]

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  PENDING: 'Pendiente',
  PAID:    'Pagada',
  OVERDUE: 'Vencida',
}

// Tipo de cuota según el número. El backend usa number=0 para la matrícula
// (enrollmentFee) y 1..N para las cuotas financiadas. Ver InstallmentGenerator.
export type InstallmentKind = 'MATRICULA' | 'CUOTA'

export function installmentKind(number: number): InstallmentKind {
  return number === 0 ? 'MATRICULA' : 'CUOTA'
}

// Etiqueta para mostrar en tablas/selects: "Matrícula" o "Cuota N".
export function installmentLabel(number: number): string {
  return number === 0 ? 'Matrícula' : `Cuota ${number}`
}

// Refleja com.imedba.modules.installment.dto.InstallmentResponse
// El backend devuelve la cuota plana: solo enrollmentId. Para mostrar alumno/curso
// hay que resolver el enrollment aparte (ver Cuotas.tsx → mapa por enrollmentId).
export interface Installment {
  id:               UUID
  enrollmentId:     UUID
  number:           number
  amount:           number          // monto base de la cuota
  surchargeAmount:  number          // recargo (5% día 11+)
  totalDue:         number          // amount + surchargeAmount
  dueDate:          string          // LocalDate YYYY-MM-DD
  status:           InstallmentStatus
  paidAt:           Instant | null
  lastAlertSentAt:  Instant | null
  notes:            string | null    // aclaración del ajuste manual del monto
  createdAt:        Instant
  updatedAt:        Instant
}

// Refleja com.imedba.modules.installment.dto.InstallmentUpdateRequest
export interface InstallmentUpdateRequest {
  amount?:  number | null
  dueDate?: string | null           // YYYY-MM-DD
  notes?:   string | null
}

// Refleja com.imedba.modules.installment.dto.DebtorResponse
// Deudor agrupado por inscripción: un alumno (en un curso) con todas sus cuotas
// impagas juntas. Alimenta la vista "agrupar pendientes por alumno" de Cuotas.
export interface Debtor {
  enrollmentId:  UUID
  studentId:     UUID
  studentName:   string             // "Apellido, Nombre"
  studentPhone:  string | null      // para el link de WhatsApp manual
  courseId:      UUID
  courseName:    string
  courseCode:    string | null
  paymentGroup:  PaymentGroup       // Grupo 1 (vence 10) / Grupo 2 (vence 20)
  nextDueDate:   string             // LocalDate YYYY-MM-DD (vencimiento más próximo)
  totalOwed:     number             // suma de totalDue de las cuotas impagas
  pendingCount:  number
  installments:  Installment[]
}
