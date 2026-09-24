import type { Commission, CommissionRequest } from '../types/diploma'
import type { Modality } from '../types/course'

export interface CommissionState {
  commission:        string
  academicYear:      string
  enrollmentPrice:   string
  coursePrice:       string
  includesPremaBook: boolean
  startDate:         string
  endDate:           string
  modality:          Modality | ''
}

export type CommissionErrors = Partial<Record<keyof CommissionState, string>>

export function commissionState(c?: Commission): CommissionState {
  return {
    commission:        c?.commission      != null ? String(c.commission)      : '',
    academicYear:      c?.academicYear    != null ? String(c.academicYear)    : String(new Date().getFullYear()),
    enrollmentPrice:   c?.enrollmentPrice != null ? String(c.enrollmentPrice) : '',
    coursePrice:       c?.coursePrice     != null ? String(c.coursePrice)     : '',
    includesPremaBook: c?.includesPremaBook === true,
    startDate:         c?.startDate ?? '',
    endDate:           c?.endDate   ?? '',
    modality:          c?.modality  ?? '',
  }
}

export function validateCommission(s: CommissionState): CommissionErrors {
  const e: CommissionErrors = {}
  const n = Number(s.commission)
  if (!s.commission)                               e.commission = 'Obligatorio'
  else if (!Number.isInteger(n) || n <= 0)         e.commission = 'Número de comisión inválido'
  for (const k of ['academicYear', 'enrollmentPrice', 'coursePrice'] as const) {
    if (s[k] && Number.isNaN(Number(s[k])))        e[k] = 'No es un número válido'
  }
  if (!s.startDate)                                e.startDate = 'Obligatorio'
  if (!s.endDate)                                  e.endDate = 'Obligatorio'
  if (s.startDate && s.endDate && s.endDate < s.startDate) e.endDate = 'No puede ser anterior al inicio'
  return e
}

// `base` conserva lo que este form no edita (activa, curso de Moodle): el PUT reemplaza todo.
export function commissionPayload(s: CommissionState, base?: Commission): CommissionRequest {
  const num = (v: string) => (v ? Number(v) : null)
  return {
    commission:        Number(s.commission),
    academicYear:      num(s.academicYear),
    enrollmentPrice:   num(s.enrollmentPrice),
    coursePrice:       num(s.coursePrice),
    includesPremaBook: s.includesPremaBook,
    startDate:         s.startDate || null,
    endDate:           s.endDate   || null,
    modality:          s.modality  || null,
    moodleCourseId:    base?.moodleCourseId ?? null,
    active:            base?.active ?? null,
  }
}
