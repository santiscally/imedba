import type { PageResponse } from '../types/common'
import type {
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
  BusinessUnit,
} from '../types/course'
import { apiGet, apiPost, apiPut, apiDelete } from './client'

// Servicio de cursos — refleja CourseController del backend (/api/v1/courses).

export interface ListCoursesParams {
  q?:            string
  businessUnit?: BusinessUnit
  active?:       boolean
  page?:         number
  size?:         number
  sort?:         string       // ej: "name,asc"
}

function buildQuery(params: ListCoursesParams): string {
  const qp = new URLSearchParams()
  if (params.q)                      qp.set('q', params.q)
  if (params.businessUnit)           qp.set('businessUnit', params.businessUnit)
  if (params.active !== undefined)   qp.set('active', String(params.active))
  if (params.page   !== undefined)   qp.set('page',   String(params.page))
  if (params.size   !== undefined)   qp.set('size',   String(params.size))
  if (params.sort)                   qp.set('sort',   params.sort)
  const s = qp.toString()
  return s ? `?${s}` : ''
}

export const coursesApi = {
  list(params: ListCoursesParams = {}): Promise<PageResponse<Course>> {
    return apiGet<PageResponse<Course>>(`/courses${buildQuery(params)}`)
  },
  get(id: string): Promise<Course> {
    return apiGet<Course>(`/courses/${id}`)
  },
  create(body: CourseCreateRequest): Promise<Course> {
    return apiPost<Course, CourseCreateRequest>('/courses', body)
  },
  update(id: string, body: CourseUpdateRequest): Promise<Course> {
    return apiPut<Course, CourseUpdateRequest>(`/courses/${id}`, body)
  },
  remove(id: string): Promise<void> {
    return apiDelete(`/courses/${id}`)
  },
}
