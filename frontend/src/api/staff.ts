import type { PageResponse } from '../types/common'
import type {
  Staff,
  StaffCreateRequest,
  StaffUpdateRequest,
  StaffSegment,
  StaffType,
} from '../types/staff'
import { apiGet, apiPost, apiPut } from './client'

// Personal Académico — refleja StaffController (/api/v1/staff).
// Authorities: staff:read / staff:write.

export interface ListStaffParams {
  type?:        StaffType
  /**
   * OJO: filtrar por RESIDENCIAS o FORMACION_SUPERIOR **incluye** a quienes están
   * marcadas como AMBAS (lo resuelve el backend en StaffSpecs.bySegment). Buscar
   * explícitamente por AMBAS devuelve sólo esas.
   */
  segment?:     StaffSegment
  paidByHours?: boolean
  tutor?:       boolean
  active?:      boolean
  q?:           string    // busca en nombre, apellido, mail, dni y materia
  page?:        number
  size?:        number
  sort?:        string    // ej: "lastName,asc"
}

function buildQuery(params: ListStaffParams): string {
  const qp = new URLSearchParams()
  if (params.type)                      qp.set('type',        params.type)
  if (params.segment)                   qp.set('segment',     params.segment)
  // `false` es un filtro válido (sueldo fijo), así que se compara contra undefined.
  if (params.paidByHours !== undefined) qp.set('paidByHours', String(params.paidByHours))
  if (params.tutor       !== undefined) qp.set('tutor',       String(params.tutor))
  if (params.active      !== undefined) qp.set('active',      String(params.active))
  if (params.q)                         qp.set('q',           params.q)
  if (params.page        !== undefined) qp.set('page',        String(params.page))
  if (params.size        !== undefined) qp.set('size',        String(params.size))
  if (params.sort)                      qp.set('sort',        params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const staffApi = {
  list(params: ListStaffParams = {}): Promise<PageResponse<Staff>> {
    return apiGet<PageResponse<Staff>>(`/staff${buildQuery(params)}`)
  },
  get(id: string): Promise<Staff> {
    return apiGet<Staff>(`/staff/${id}`)
  },
  /** Activas de un rol, sin paginar — para poblar selectores (ej. directoras de una diplomatura). */
  listActiveByType(type: StaffType): Promise<Staff[]> {
    return apiGet<Staff[]>(`/staff/by-type/${type}`)
  },
  create(body: StaffCreateRequest): Promise<Staff> {
    return apiPost<Staff, StaffCreateRequest>('/staff', body)
  },
  update(id: string, body: StaffUpdateRequest): Promise<Staff> {
    return apiPut<Staff, StaffUpdateRequest>(`/staff/${id}`, body)
  },
  deactivate(id: string): Promise<void> {
    return apiPut<void, undefined>(`/staff/${id}/deactivate`, undefined)
  },
}
