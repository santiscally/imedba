import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.discount.entity.DiscountType
export type DiscountType = 'PERCENTAGE' | 'FIXED'

export const DISCOUNT_TYPES: DiscountType[] = ['PERCENTAGE', 'FIXED']

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: 'Porcentaje',
  FIXED:      'Monto fijo',
}

// Refleja com.imedba.modules.discount.dto.DiscountCampaignResponse
export interface DiscountCampaign {
  id:           UUID
  name:         string
  description:  string | null
  discountType: DiscountType
  value:        number          // ≤100 si PERCENTAGE
  validFrom:    string | null   // LocalDate (YYYY-MM-DD)
  validTo:      string | null
  active:       boolean
  createdAt:    Instant
  updatedAt:    Instant
}

// Refleja DiscountCampaignCreateRequest
export interface DiscountCampaignCreateRequest {
  name:         string                  // required, max 200
  description?: string | null
  discountType: DiscountType            // required
  value:        number                  // required, > 0; ≤100 si PERCENTAGE
  validFrom?:   string | null
  validTo?:     string | null
  active?:      boolean
}

// Update idéntico a Create
export type DiscountCampaignUpdateRequest = DiscountCampaignCreateRequest
