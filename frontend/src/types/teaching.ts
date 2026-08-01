import type { Instant, UUID } from './common'

// Grilla de clases + liquidación de horas docentes (V037, doc 17 §3.2).
// Refleja com.imedba.modules.teaching.dto.TeachingDtos.
//
// OJO con los null: el backend serializa con `default-property-inclusion:
// non_null` (application.yml), así que los campos nulos NO viajan en el JSON y
// acá llegan como `undefined`, no como `null`. Los tipos los declaran `| null`
// por fidelidad con el DTO de Java; en el código usar siempre `?.` / `??` / `!x`,
// que tratan ambos igual. Nunca comparar con `=== null`.

/**
 * Con qué rol se liquida. Una misma persona puede aparecer como DOCENTE en unas
 * clases y como PRECEPTORA en otras: son dos liquidaciones separadas, porque el
 * valor hora y la fórmula difieren.
 */
export type TeachingRole = 'DOCENTE' | 'PRECEPTORA'

export const TEACHING_ROLES: TeachingRole[] = ['DOCENTE', 'PRECEPTORA']

export const TEACHING_ROLE_LABELS: Record<TeachingRole, string> = {
  DOCENTE:    'Docente',
  PRECEPTORA: 'Preceptora',
}

export type TeachingSettlementStatus = 'DRAFT' | 'APPROVED' | 'PAID'

export const TEACHING_STATUS_LABELS: Record<TeachingSettlementStatus, string> = {
  DRAFT:    'Borrador',
  APPROVED: 'Aprobada',
  PAID:     'Pagada',
}

/** Una clase dictada — la grilla que carga la secretaría. */
export interface ClassSession {
  id:            UUID
  sessionDate:   string          // ISO yyyy-MM-dd
  commission:    string | null   // «COM 9», «comunidad imedba»…
  subject:       string | null
  classLabel:    string | null
  /** Sólo las sincrónicas entran en la liquidación. */
  synchronous:   boolean | null
  scheduledTime: string | null   // «18-20»
  zoomAccount:   string | null
  sessionLink:   string | null
  teacherId:     UUID | null
  teacherName:   string | null
  /** Se asigna por clase; puede no ser la misma persona que la docente. */
  preceptorId:   UUID | null
  preceptorName: string | null
  actualHours:   number | null
  /** Lo confirma Cobranzas. null = se usa actualHours. */
  hoursToPay:    number | null
  notes:         string | null
  createdAt:     Instant
  updatedAt:     Instant
}

export interface ClassSessionRequest {
  sessionDate:    string
  commission?:    string | null
  subject?:       string | null
  classLabel?:    string | null
  synchronous?:   boolean | null
  scheduledTime?: string | null
  zoomAccount?:   string | null
  sessionLink?:   string | null
  teacherId?:     UUID | null
  preceptorId?:   UUID | null
  actualHours?:   number | null
  hoursToPay?:    number | null
  notes?:         string | null
}

export interface HoursToPayRequest {
  sessionId:  UUID
  hoursToPay: number | null
}

/** Persona con clases en el período, con el rol en el que participó. */
export interface TeachingCandidate {
  staffId:        UUID
  staffName:      string
  role:           TeachingRole
  classCount:     number
  /** false = cobra sueldo fijo, no se le liquida por horas (caso Ailen). */
  paidByHours:    boolean
  alreadySettled: boolean
}

export interface TeachingSettlementLine {
  id:             UUID | null
  classSessionId: UUID
  sessionDate:    string
  commission:     string | null
  subject:        string | null
  classLabel:     string | null
  hoursPaid:      number
}

/**
 * Liquidación de una persona en un mes.
 *
 *   DOCENTE:    total = totalHours × hourlyRate
 *   PRECEPTORA: total = (totalHours + 0,25 × classCount) × hourlyRate
 *
 * El 0,25 son los 15 min de anticipación y se suma UNA VEZ POR CLASE. No es un
 * recargo del 25% sobre el total: con clases de 2 h la diferencia es real.
 */
export interface TeachingSettlement {
  id:                  UUID | null   // null en el preview
  staffId:             UUID
  staffName:           string
  periodYear:          number
  periodMonth:         number
  role:                TeachingRole
  hourlyRate:          number
  /** 0,25 para preceptoras, 0 para docentes. */
  perClassBonusHours:  number
  classCount:          number
  totalHours:          number   // Σ horas a pagar
  bonusHours:          number   // perClassBonusHours × classCount
  billableHours:       number   // totalHours + bonusHours
  totalAmount:         number
  invoiceEmailSentAt:  Instant | null
  invoiceReceived:     boolean | null
  paidAt:              Instant | null
  status:              TeachingSettlementStatus
  notes:               string | null
  lines:               TeachingSettlementLine[]
  createdAt:           Instant | null
  updatedAt:           Instant | null
}

export interface TeachingSettlementSummary {
  id:            UUID
  staffId:       UUID
  staffName:     string
  periodYear:    number
  periodMonth:   number
  role:          TeachingRole
  classCount:    number
  billableHours: number
  totalAmount:   number
  status:        TeachingSettlementStatus
}

export interface TeachingSettlementCreateRequest {
  staffId:     UUID
  role:        TeachingRole
  periodMonth: number
  periodYear:  number
  /** null = usa el valor hora vigente del rol. */
  hourlyRate?: number | null
  notes?:      string | null
}

/** Convierte horas decimales a «2 h 50» — el formato que usa la planilla de IMEDBA. */
export function formatHours(h: number | null | undefined): string {
  if (h == null) return '—'
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  if (mins === 0) return `${whole} h`
  return `${whole} h ${String(mins).padStart(2, '0')}`
}
