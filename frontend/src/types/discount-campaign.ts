import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.discount.entity.DiscountType
export type DiscountType = 'PERCENTAGE' | 'FIXED'

export const DISCOUNT_TYPES: DiscountType[] = ['PERCENTAGE', 'FIXED']

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: 'Porcentaje',
  FIXED:      'Monto fijo',
}

// Refleja com.imedba.modules.discount_campaign.dto.DiscountCampaignResponse
// ⚠️ Los nombres son los del backend: discountValue / startDate / endDate.
export interface DiscountCampaign {
  id:            UUID
  name:          string
  description:   string | null
  discountType:  DiscountType
  discountValue: number          // ≤100 si PERCENTAGE
  startDate:     string          // LocalDate (YYYY-MM-DD) — requerido en backend
  endDate:       string          // LocalDate (YYYY-MM-DD) — requerido en backend
  active:        boolean
  createdAt:     Instant
  updatedAt:     Instant
}

// Refleja DiscountCampaignCreateRequest. startDate/endDate son @NotNull en el
// backend, por eso van obligatorios (NO opcionales).
export interface DiscountCampaignCreateRequest {
  name:          string                  // required, max 200
  description?:  string | null
  discountType:  DiscountType            // required
  discountValue: number                  // required, ≥ 0; ≤100 si PERCENTAGE
  startDate:     string                  // required, YYYY-MM-DD
  endDate:       string                  // required, YYYY-MM-DD
  active?:       boolean
}

// Update idéntico a Create
export type DiscountCampaignUpdateRequest = DiscountCampaignCreateRequest
