import type { PageResponse } from '../types/common'
import type {
  DiscountCampaign,
  DiscountCampaignCreateRequest,
  DiscountCampaignUpdateRequest,
} from '../types/discount-campaign'
import { apiGet, apiPost, apiPut, apiDelete } from './client'

// Servicio de campañas de descuento — refleja DiscountCampaignController
// (/api/v1/discount-campaigns).

export interface ListDiscountCampaignsParams {
  q?:       string
  active?:  boolean
  page?:    number
  size?:    number
  sort?:    string
}

function buildQuery(params: ListDiscountCampaignsParams): string {
  const qp = new URLSearchParams()
  if (params.q)                    qp.set('q',      params.q)
  if (params.active !== undefined) qp.set('active', String(params.active))
  if (params.page   !== undefined) qp.set('page',   String(params.page))
  if (params.size   !== undefined) qp.set('size',   String(params.size))
  if (params.sort)                 qp.set('sort',   params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const discountCampaignsApi = {
  list(params: ListDiscountCampaignsParams = {}): Promise<PageResponse<DiscountCampaign>> {
    return apiGet<PageResponse<DiscountCampaign>>(`/discount-campaigns${buildQuery(params)}`)
  },
  get(id: string): Promise<DiscountCampaign> {
    return apiGet<DiscountCampaign>(`/discount-campaigns/${id}`)
  },
  create(body: DiscountCampaignCreateRequest): Promise<DiscountCampaign> {
    return apiPost<DiscountCampaign, DiscountCampaignCreateRequest>('/discount-campaigns', body)
  },
  update(id: string, body: DiscountCampaignUpdateRequest): Promise<DiscountCampaign> {
    return apiPut<DiscountCampaign, DiscountCampaignUpdateRequest>(`/discount-campaigns/${id}`, body)
  },
  remove(id: string): Promise<void> {
    return apiDelete(`/discount-campaigns/${id}`)
  },
}
