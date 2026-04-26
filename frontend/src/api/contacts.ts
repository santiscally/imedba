import type { PageResponse } from '../types/common'
import type {
  Contact,
  ContactCreateRequest,
  ContactUpdateRequest,
  ContactType,
} from '../types/contact'
import { apiGet, apiPost, apiPut } from './client'

// Servicio de contactos — refleja ContactController (/api/v1/contacts).
// Soft delete vía PUT /{id}/deactivate (no DELETE).

export interface ListContactsParams {
  type?:    ContactType
  active?:  boolean
  q?:       string
  page?:    number
  size?:    number
  sort?:    string
}

function buildQuery(params: ListContactsParams): string {
  const qp = new URLSearchParams()
  if (params.type)                 qp.set('type',   params.type)
  if (params.active !== undefined) qp.set('active', String(params.active))
  if (params.q)                    qp.set('q',      params.q)
  if (params.page !== undefined)   qp.set('page',   String(params.page))
  if (params.size !== undefined)   qp.set('size',   String(params.size))
  if (params.sort)                 qp.set('sort',   params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const contactsApi = {
  list(params: ListContactsParams = {}): Promise<PageResponse<Contact>> {
    return apiGet<PageResponse<Contact>>(`/contacts${buildQuery(params)}`)
  },
  get(id: string): Promise<Contact> {
    return apiGet<Contact>(`/contacts/${id}`)
  },
  create(body: ContactCreateRequest): Promise<Contact> {
    return apiPost<Contact, ContactCreateRequest>('/contacts', body)
  },
  update(id: string, body: ContactUpdateRequest): Promise<Contact> {
    return apiPut<Contact, ContactUpdateRequest>(`/contacts/${id}`, body)
  },
  deactivate(id: string): Promise<void> {
    return apiPut<void, undefined>(`/contacts/${id}/deactivate`, undefined)
  },
}
