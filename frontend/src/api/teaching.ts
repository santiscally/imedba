import type { PageResponse } from '../types/common'
import type {
  ClassSession,
  ClassSessionRequest,
  HoursToPayRequest,
  TeachingCandidate,
  TeachingRole,
  TeachingSettlement,
  TeachingSettlementCreateRequest,
  TeachingSettlementSummary,
} from '../types/teaching'
import { apiGet, apiPost, apiPut, apiDelete } from './client'

// Grilla de clases + liquidación docente — refleja TeachingController
// (/api/v1/teaching). Authorities: hour_logs:* para la grilla, settlements:* para
// la liquidación.

export interface ListSessionsParams {
  year?:        number
  month?:       number
  teacherId?:   string
  preceptorId?: string
  /** false trae sólo las asincrónicas, que NO entran en la liquidación. */
  synchronous?: boolean
  commission?:  string
  page?:        number
  size?:        number
  sort?:        string   // ej: "sessionDate,asc"
}

function buildQuery(p: ListSessionsParams): string {
  const qp = new URLSearchParams()
  if (p.year        !== undefined) qp.set('year',        String(p.year))
  if (p.month       !== undefined) qp.set('month',       String(p.month))
  if (p.teacherId)                 qp.set('teacherId',   p.teacherId)
  if (p.preceptorId)               qp.set('preceptorId', p.preceptorId)
  if (p.synchronous !== undefined) qp.set('synchronous', String(p.synchronous))
  if (p.commission)                qp.set('commission',  p.commission)
  if (p.page        !== undefined) qp.set('page',        String(p.page))
  if (p.size        !== undefined) qp.set('size',        String(p.size))
  if (p.sort)                      qp.set('sort',        p.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const teachingApi = {
  // ─── Grilla de clases ──────────────────────────────────────────────────────

  listSessions(params: ListSessionsParams = {}): Promise<PageResponse<ClassSession>> {
    return apiGet<PageResponse<ClassSession>>(`/teaching/sessions${buildQuery(params)}`)
  },
  getSession(id: string): Promise<ClassSession> {
    return apiGet<ClassSession>(`/teaching/sessions/${id}`)
  },
  createSession(body: ClassSessionRequest): Promise<ClassSession> {
    return apiPost<ClassSession, ClassSessionRequest>('/teaching/sessions', body)
  },
  updateSession(id: string, body: ClassSessionRequest): Promise<ClassSession> {
    return apiPut<ClassSession, ClassSessionRequest>(`/teaching/sessions/${id}`, body)
  },
  /** Confirma las horas a pagar de varias clases de una — el cierre de mes. */
  setHoursToPay(items: HoursToPayRequest[]): Promise<{ updated: number }> {
    return apiPut<{ updated: number }, HoursToPayRequest[]>(
      '/teaching/sessions/hours-to-pay', items)
  },
  deleteSession(id: string): Promise<void> {
    return apiDelete(`/teaching/sessions/${id}`)
  },

  // ─── Liquidación ───────────────────────────────────────────────────────────

  /** Quiénes tienen clases en el período y si ya se les liquidó. */
  candidates(year: number, month: number): Promise<TeachingCandidate[]> {
    return apiGet<TeachingCandidate[]>(
      `/teaching/settlements/candidates?year=${year}&month=${month}`)
  },

  /** Calcula sin persistir. Devuelve `id: null` en la liquidación y en las líneas. */
  preview(
    staffId: string, role: TeachingRole, year: number, month: number, hourlyRate?: number,
  ): Promise<TeachingSettlement> {
    const qp = new URLSearchParams({
      staffId, role, year: String(year), month: String(month),
    })
    if (hourlyRate !== undefined) qp.set('hourlyRate', String(hourlyRate))
    return apiGet<TeachingSettlement>(`/teaching/settlements/preview?${qp}`)
  },

  listSettlements(year: number, month: number): Promise<TeachingSettlementSummary[]> {
    return apiGet<TeachingSettlementSummary[]>(
      `/teaching/settlements?year=${year}&month=${month}`)
  },
  getSettlement(id: string): Promise<TeachingSettlement> {
    return apiGet<TeachingSettlement>(`/teaching/settlements/${id}`)
  },
  createSettlement(body: TeachingSettlementCreateRequest): Promise<TeachingSettlement> {
    return apiPost<TeachingSettlement, TeachingSettlementCreateRequest>(
      '/teaching/settlements', body)
  },
  recompute(id: string): Promise<TeachingSettlement> {
    return apiPut<TeachingSettlement, undefined>(`/teaching/settlements/${id}/recompute`, undefined)
  },
  approve(id: string): Promise<TeachingSettlement> {
    return apiPut<TeachingSettlement, undefined>(`/teaching/settlements/${id}/approve`, undefined)
  },
  markInvoiceSent(id: string): Promise<TeachingSettlement> {
    return apiPut<TeachingSettlement, undefined>(
      `/teaching/settlements/${id}/invoice-sent`, undefined)
  },
  markInvoiceReceived(id: string): Promise<TeachingSettlement> {
    return apiPut<TeachingSettlement, undefined>(
      `/teaching/settlements/${id}/invoice-received`, undefined)
  },
  markPaid(id: string): Promise<TeachingSettlement> {
    return apiPut<TeachingSettlement, undefined>(`/teaching/settlements/${id}/mark-paid`, undefined)
  },
}
