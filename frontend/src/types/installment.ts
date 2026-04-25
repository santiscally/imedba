import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.installment.entity.InstallmentStatus
export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'SUSPENDED'

export const INSTALLMENT_STATUSES: InstallmentStatus[] = [
  'PENDING',
  'PAID',
  'OVERDUE',
  'SUSPENDED',
]

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  PENDING:   'Pendiente',
  PAID:      'Pagada',
  OVERDUE:   'Vencida',
  SUSPENDED: 'Suspendida',
}

// Datos resumidos del enrollment embebidos en el response (para listar
// cuotas sin tener que ir a buscar la inscripción aparte).
export interface InstallmentEnrollmentSummary {
  id:               UUID
  studentId:        UUID
  studentFirstName: string
  studentLastName:  string
  courseId:         UUID
  courseName:       string
  courseCode:       string | null
}

// Refleja com.imedba.modules.installment.dto.InstallmentResponse
export interface Installment {
  id:               UUID
  enrollment:       InstallmentEnrollmentSummary
  number:           number
  dueDate:          string         // LocalDate YYYY-MM-DD
  baseAmount:       number
  surcharge:        number         // 5% si está pagada > día 10 del mes
  totalDue:         number         // baseAmount + surcharge
  status:           InstallmentStatus
  paidAt:           Instant | null
  moodleSuspended:  boolean        // flag puesto por el job del día 22
  createdAt:        Instant
  updatedAt:        Instant
}
