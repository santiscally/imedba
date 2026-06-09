import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.diplomasettlement.entity.SettlementStatus
export type SettlementStatus = 'DRAFT' | 'APPROVED' | 'PAID'

export const SETTLEMENT_STATUSES: SettlementStatus[] = ['DRAFT', 'APPROVED', 'PAID']

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  DRAFT:    'Borrador',
  APPROVED: 'Aprobada',
  PAID:     'Pagada',
}

// Refleja com.imedba.modules.diplomasettlement.dto.PartnerDistributionDto
export interface PartnerDistribution {
  name:   string
  pct:    number
  amount: number
  email:  string | null
  paid:   boolean | null
}

// Refleja com.imedba.modules.diplomasettlement.dto.DiplomaSettlementResponse
export interface DiplomaSettlement {
  id:                   UUID
  diplomaId:            UUID
  diplomaName:          string
  periodMonth:          number   // 1–12
  periodYear:           number
  totalCollected:       number
  taxCommissionAmount:  number
  secretaryAmount:      number
  advertisingAmount:    number
  adminAmount:          number
  universityAmount:     number
  imedbaAmount:         number
  partnersTotal:        number
  partnersDistribution: PartnerDistribution[]
  status:               SettlementStatus
  createdAt:            Instant
  updatedAt:            Instant
}

// Refleja DiplomaSettlementCreateRequest
// Inputs por liquidación (reunión 2026-05-22 §2.6): costos fijos + reparto institucional
// se cargan acá, NO en la diplomatura. Cualquiera en null hace fallback al valor del Diploma.
export interface DiplomaSettlementCreateRequest {
  diplomaId:          UUID
  periodMonth:        number   // 1–12
  periodYear:         number
  totalCollected?:    number | null   // null = el backend suma los pagos del período del curso vinculado (V026)
  taxCommissionPct?:  number | null   // 0–100
  secretarySalary?:   number | null
  advertisingAmount?: number | null
  adminPct?:          number | null   // 0–100
  universityPct?:     number | null   // 0–100
  imedbaPct?:         number | null   // 0–100
}
