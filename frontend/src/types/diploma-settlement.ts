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
export interface DiplomaSettlementCreateRequest {
  diplomaId:      UUID
  periodMonth:    number   // 1–12
  periodYear:     number
  totalCollected: number   // ≥ 0
}
