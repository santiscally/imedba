import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.course.entity.BusinessUnit
// Fase 9.a (V015): unificado — PREMATUROS pasó a ser una diplomatura dentro de
// FORMACION_SUPERIOR y OTROS se renombró a GENERAL.
export type BusinessUnit =
  | 'RESIDENCIAS'
  | 'EDITORIAL'
  | 'FORMACION_SUPERIOR'
  | 'GENERAL'

export const BUSINESS_UNITS: BusinessUnit[] = [
  'RESIDENCIAS',
  'EDITORIAL',
  'FORMACION_SUPERIOR',
  'GENERAL',
]

// Etiquetas visibles — FUENTE ÚNICA de los labels de unidad de negocio.
// Cualquier select/header/columna que muestre la unidad importa de acá
// (unidad.tsx y budget.ts re-exportan este map). No redefinir en otro lado.
export const BUSINESS_UNIT_LABELS: Record<BusinessUnit, string> = {
  RESIDENCIAS:        'Residencias Médicas',
  EDITORIAL:          'Editorial',
  FORMACION_SUPERIOR: 'Formación Superior',
  GENERAL:            'General',
}

// El catálogo de países vive en types/country.ts (reutilizable). Course.country
// guarda el código ISO-2 (ver Country / COUNTRIES / COUNTRY_LABELS).

/**
 * Tipo de curso (V038). Uno de los tres ejes con los que IMEDBA diferencia sus
 * cursos, junto con el NOMBRE —el eje editable: Tucumán, Córdoba, Junio/Julio…—
 * y la modalidad.
 *
 * Correcciones 2026-07-23: «Tipo de curso: Normal (o sin detalle, es el curso
 * anual clásico), Intensivo y Choice».
 */
export type CourseType = 'NORMAL' | 'INTENSIVO' | 'CHOICE'

export const COURSE_TYPES: CourseType[] = ['NORMAL', 'INTENSIVO', 'CHOICE']

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  NORMAL:    'Normal (anual clásico)',
  INTENSIVO: 'Intensivo',
  CHOICE:    'Choice',
}

/** Modalidad de cursado (V038): por su cuenta o con clases en vivo. */
export type Modality = 'LIBRE' | 'VIVO'

export const MODALITIES: Modality[] = ['LIBRE', 'VIVO']

export const MODALITY_LABELS: Record<Modality, string> = {
  LIBRE: 'Libre',
  VIVO:  'Vivo',
}

/**
 * Antes de V038 `modality` era texto libre y mezclaba tres conceptos: la
 * modalidad real, el tipo de curso (TRADICIONAL, SUPER_INTENSIVO, MIX_FEBRERO…)
 * y el producto de Formación Superior («Diplomatura Prematuros», «Curso PAF»).
 * Por eso no se podía agrupar por tipo ni por modalidad, que es justo lo que el
 * cliente pidió. Los productos de FS se identifican por el NOMBRE del curso;
 * Reválida y banco de preguntas, también.
 */

// Refleja com.imedba.modules.course.dto.CourseResponse
export interface Course {
  id:                   UUID
  name:                 string
  code:                 string | null
  description:          string | null
  businessUnit:         BusinessUnit
  courseType:           CourseType | null   // NORMAL | INTENSIVO | CHOICE
  modality:             Modality | null     // LIBRE | VIVO
  country:              string | null   // ISO-2 (AR/UY); default 'AR' en backend
  enrollmentPrice:      number | null   // BigDecimal en backend → number en JS
  coursePrice:          number | null
  academicYear:         number | null   // ciclo lectivo / año (ej. 2026); null = curso "libre"
  commission:           number | null   // nro de comisión (solo Formación Superior)
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
  courseType?:           CourseType | null
  modality?:             Modality | null
  country?:              string | null            // ISO-2 (AR/UY), default AR
  enrollmentPrice?:      number | null            // ≥ 0
  coursePrice?:          number | null            // ≥ 0
  academicYear?:         number | null            // ciclo lectivo / año (ej. 2026)
  commission?:           number | null            // nro de comisión (solo Formación Superior)
  contractTemplatePath?: string | null            // max 500
  moodleCourseId?:       number | null
  active?:               boolean
}

// CourseUpdateRequest idéntico a Create
export type CourseUpdateRequest = CourseCreateRequest

// ⚠️ Plan de pagos 6 cuotas (solo Plus 2027) y descuento sistémico 10% pago único
// por transferencia NO están modelados como campos de Course — viven en
// discount_campaigns / logic de cuotas. Ver analisis-excel-imedba.md §Hoja 9.
