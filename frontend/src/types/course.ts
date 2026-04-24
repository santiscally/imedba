import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.course.entity.BusinessUnit
export type BusinessUnit =
  | 'RESIDENCIAS'
  | 'PREMATUROS'
  | 'EDITORIAL'
  | 'FORMACION_SUPERIOR'
  | 'OTROS'

export const BUSINESS_UNITS: BusinessUnit[] = [
  'RESIDENCIAS',
  'PREMATUROS',
  'EDITORIAL',
  'FORMACION_SUPERIOR',
  'OTROS',
]

// Etiquetas visibles (orden del Excel)
export const BUSINESS_UNIT_LABELS: Record<BusinessUnit, string> = {
  RESIDENCIAS:        'Residencias',
  PREMATUROS:         'Prematuros',
  EDITORIAL:          'Editorial',
  FORMACION_SUPERIOR: 'Formación Superior',
  OTROS:              'Otros',
}

// Modalidades observadas en `precio de lista` y `excel datos alumnos`
// (texto libre en el backend — VARCHAR 50 — pero mantenemos este listado
//  como referencia para autocompletar el form).
export const MODALITIES_SUGERIDAS = [
  'LIBRE',
  'VIVO',
  'SOLO_CHOICE',
  'INTENSIVO',
  'PLUS',
  'REVALIDA',
  'TRADICIONAL',
  'MIX_FEBRERO',
  'SUPER_INTENSIVO',
] as const

// Refleja com.imedba.modules.course.dto.CourseResponse
export interface Course {
  id:                   UUID
  name:                 string
  code:                 string | null
  description:          string | null
  businessUnit:         BusinessUnit
  modality:             string | null
  enrollmentPrice:      number | null   // BigDecimal en backend → number en JS
  coursePrice:          number | null
  examDate:             string | null   // LocalDate ISO (YYYY-MM-DD)
  contractTemplatePath: string | null
  moodleCourseId:       number | null
  active:               boolean | null
  createdAt:            Instant
  updatedAt:            Instant
}

// Refleja com.imedba.modules.course.dto.CourseCreateRequest
export interface CourseCreateRequest {
  name:                  string                   // required, max 200
  code?:                 string | null            // max 50
  description?:          string | null
  businessUnit:          BusinessUnit             // required
  modality?:             string | null            // max 50
  enrollmentPrice?:      number | null            // ≥ 0
  coursePrice?:          number | null            // ≥ 0
  examDate?:             string | null            // YYYY-MM-DD
  contractTemplatePath?: string | null            // max 500
  moodleCourseId?:       number | null
  active?:               boolean
}

// CourseUpdateRequest idéntico a Create
export type CourseUpdateRequest = CourseCreateRequest

// ⚠️ Plan de pagos 6 cuotas (solo Plus 2027) y descuento sistémico 10% pago único
// por transferencia NO están modelados como campos de Course — viven en
// discount_campaigns / logic de cuotas. Ver analisis-excel-imedba.md §Hoja 9.
