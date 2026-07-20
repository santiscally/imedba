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

// Modalidades de Formación Superior (reunión 12-jun, lista de Jaque).
export const MODALITIES_FORMACION_SUPERIOR = [
  'Diplomatura Prematuros',
  'Diplomatura Neurodesarrollo',
  'Curso PAF',
] as const

// Modalidad en cascada según unidad de negocio (reunión 12-jun): FS usa las
// diplomaturas; el resto, las sugeridas de Residencias.
export function modalitiesFor(bu: BusinessUnit): readonly string[] {
  return bu === 'FORMACION_SUPERIOR'
    ? MODALITIES_FORMACION_SUPERIOR
    : MODALITIES_SUGERIDAS
}

// Label bonito para modalidades de Residencias (guardadas en DB con estilo
// SCREAMING_SNAKE_CASE por histórico). Ej: 'SUPER_INTENSIVO' → 'Súper intensivo'.
// Las de FS ya vienen en Title Case → se dejan tal cual.
const MODALITY_OVERRIDES: Record<string, string> = {
  SUPER_INTENSIVO: 'Súper intensivo',
  MIX_FEBRERO:     'Mix febrero',
  SOLO_CHOICE:     'Solo Choice',
  REVALIDA:        'Reválida',
}

export function formatModality(m: string | null | undefined): string {
  if (!m) return '—'
  if (MODALITY_OVERRIDES[m]) return MODALITY_OVERRIDES[m]
  // Si no está en overrides pero viene en SCREAMING_SNAKE: primer letra en mayúscula.
  if (/^[A-Z_]+$/.test(m)) {
    const lower = m.toLowerCase().replace(/_/g, ' ')
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }
  return m
}

// Refleja com.imedba.modules.course.dto.CourseResponse
export interface Course {
  id:                   UUID
  name:                 string
  code:                 string | null
  description:          string | null
  businessUnit:         BusinessUnit
  modality:             string | null
  country:              string | null   // ISO-2 (AR/UY); default 'AR' en backend
  enrollmentPrice:      number | null   // BigDecimal en backend → number en JS
  coursePrice:          number | null
  academicYear:         number | null   // ciclo lectivo / año (ej. 2026); null = curso "libre"
  commission:           number | null   // nro de comisión (solo Formación Superior)
  contractTemplatePath: string | null
  moodleCourseId:       number | null
  includesPremaBook:    boolean | null   // V035: al inscribir alumno se auto-descuenta libro PREMA
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
  country?:              string | null            // ISO-2 (AR/UY), default AR
  enrollmentPrice?:      number | null            // ≥ 0
  coursePrice?:          number | null            // ≥ 0
  academicYear?:         number | null            // ciclo lectivo / año (ej. 2026)
  commission?:           number | null            // nro de comisión (solo Formación Superior)
  contractTemplatePath?: string | null            // max 500
  moodleCourseId?:       number | null
  includesPremaBook?:    boolean | null           // V035: auto-descuento libro PREMA al inscribir
  active?:               boolean
}

// CourseUpdateRequest idéntico a Create
export type CourseUpdateRequest = CourseCreateRequest

// ⚠️ Plan de pagos 6 cuotas (solo Plus 2027) y descuento sistémico 10% pago único
// por transferencia NO están modelados como campos de Course — viven en
// discount_campaigns / logic de cuotas. Ver analisis-excel-imedba.md §Hoja 9.
