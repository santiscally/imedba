import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.enrollment.entity.EnrollmentStatus
export type EnrollmentStatus = 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED'

export const ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  'ACTIVE',
  'SUSPENDED',
  'COMPLETED',
  'CANCELLED',
]

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE:    'Activa',
  SUSPENDED: 'Suspendida',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

// Refleja com.imedba.common.enums.PaymentMethod
export type PaymentMethod =
  | 'TRANSFERENCIA'
  | 'EFECTIVO'
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO'
  | 'MERCADO_PAGO'
  | 'DEBITO_AUTOMATICO'
  | 'OTRO'

export const PAYMENT_METHODS: PaymentMethod[] = [
  'TRANSFERENCIA',
  'EFECTIVO',
  'TARJETA_CREDITO',
  'TARJETA_DEBITO',
  'MERCADO_PAGO',
  'DEBITO_AUTOMATICO',
  'OTRO',
]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TRANSFERENCIA:     'Transferencia',
  EFECTIVO:          'Efectivo',
  TARJETA_CREDITO:   'Tarjeta de crédito',
  TARJETA_DEBITO:    'Tarjeta de débito',
  MERCADO_PAGO:      'Mercado Pago',
  DEBITO_AUTOMATICO: 'Débito automático',
  OTRO:              'Otro',
}

// Refleja EnrollmentResponse.StudentSummary
export interface EnrollmentStudentSummary {
  id:        UUID
  firstName: string
  lastName:  string
  email:     string
}

// Refleja EnrollmentResponse.CourseSummary
export interface EnrollmentCourseSummary {
  id:   UUID
  name: string
  code: string | null
}

// Refleja com.imedba.modules.enrollment.dto.EnrollmentResponse
export interface Enrollment {
  id:                 UUID
  student:            EnrollmentStudentSummary
  course:             EnrollmentCourseSummary
  discountCampaignId: UUID | null
  enrolledBy:         UUID | null
  enrollmentDate:     Instant

  listPrice:          number | null
  discountPercentage: number | null
  finalPrice:         number | null
  bookPrice:          number | null
  totalPrice:         number | null

  enrollmentFee:      number | null
  numInstallments:    number | null
  paymentMethod:      PaymentMethod | null

  contractFilePath:   string | null
  contractSentAt:     Instant | null
  contractSignedAt:   Instant | null

  status:             EnrollmentStatus
  moodleStatus:       string | null
  notes:              string | null

  createdAt:          Instant
  updatedAt:          Instant
}

// Refleja com.imedba.modules.enrollment.dto.EnrollmentCreateRequest
export interface EnrollmentCreateRequest {
  studentId:           UUID
  courseId:            UUID
  discountCampaignId?: UUID | null
  enrollmentDate?:     Instant | null

  listPrice?:          number | null
  discountPercentage?: number | null   // 0–100
  bookPrice?:          number | null

  enrollmentFee?:      number | null
  numInstallments?:    number | null   // ≥ 1
  paymentMethod?:      PaymentMethod | null

  contractFilePath?:   string | null   // max 500
  notes?:              string | null
}

// Refleja com.imedba.modules.enrollment.dto.EnrollmentUpdateRequest
// (no incluye studentId / courseId — inmutables después de crear)
export interface EnrollmentUpdateRequest {
  discountCampaignId?: UUID | null

  listPrice?:          number | null
  discountPercentage?: number | null
  bookPrice?:          number | null

  enrollmentFee?:      number | null
  numInstallments?:    number | null
  paymentMethod?:      PaymentMethod | null

  contractFilePath?:   string | null
  contractSentAt?:     Instant | null
  contractSignedAt?:   Instant | null

  notes?:              string | null
}
