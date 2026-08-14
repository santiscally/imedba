import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.staff.entity.StaffType.
// DIRECTORA se agregó en V034: las directoras de PREMA se cargan como personal
// académico y la liquidación de la diplomatura las referencia desde acá.
// TUTORA se sacó en V036: una tutora es una docente que además hace seguimiento,
// no un rol distinto. Pasó a ser el flag `tutor`.
export type StaffType = 'DOCENTE' | 'PRECEPTORA' | 'DIRECTORA'

export const STAFF_TYPES: StaffType[] = ['DOCENTE', 'PRECEPTORA', 'DIRECTORA']

export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  DOCENTE:    'Docente',
  PRECEPTORA: 'Preceptora',
  DIRECTORA:  'Directora',
}

// Refleja com.imedba.modules.staff.entity.StaffSegment (V034).
export type StaffSegment = 'RESIDENCIAS' | 'FORMACION_SUPERIOR' | 'AMBAS'

export const STAFF_SEGMENTS: StaffSegment[] = ['RESIDENCIAS', 'FORMACION_SUPERIOR', 'AMBAS']

export const STAFF_SEGMENT_LABELS: Record<StaffSegment, string> = {
  RESIDENCIAS:        'Residencias',
  FORMACION_SUPERIOR: 'Formación Superior',
  AMBAS:              'Ambas',
}

// Refleja com.imedba.modules.staff.dto.StaffResponse
export interface Staff {
  id:          UUID
  firstName:   string
  lastName:    string
  email:       string | null
  phone:       string | null
  staffType:   StaffType

  // Personal Académico (V034)
  dni:         string | null
  subject:     string | null        // materia/s que da — texto libre
  segment:     StaffSegment | null  // null = sin especificar (filas viejas)
  paidByHours: boolean | null       // false = sueldo fijo, fuera de la liquidación por horas
  tutor:       boolean | null       // además de su rol, hace seguimiento de alumnos
  hourlyRate:  number | null        // override del valor hora; null = usar el del tipo de actividad

  active:      boolean | null
  notes:       string | null
  createdAt:   Instant
  updatedAt:   Instant
}

// Refleja com.imedba.modules.staff.dto.StaffCreateRequest
export interface StaffCreateRequest {
  firstName:    string
  lastName:     string
  email?:       string | null
  phone?:       string | null
  staffType:    StaffType
  dni?:         string | null
  subject?:     string | null
  segment?:     StaffSegment | null
  paidByHours?: boolean | null      // null = true en el backend
  tutor?:       boolean | null
  hourlyRate?:  number | null
  notes?:       string | null
}

// Refleja com.imedba.modules.staff.dto.StaffUpdateRequest
// Los campos en null se IGNORAN (el mapper usa NullValuePropertyMappingStrategy.IGNORE).
export interface StaffUpdateRequest {
  firstName?:   string | null
  lastName?:    string | null
  email?:       string | null
  phone?:       string | null
  staffType?:   StaffType | null
  dni?:         string | null
  subject?:     string | null
  segment?:     StaffSegment | null
  paidByHours?: boolean | null
  tutor?:       boolean | null
  hourlyRate?:  number | null
  active?:      boolean | null
  notes?:       string | null
}

export function staffFullName(s: Staff): string {
  return `${s.lastName}, ${s.firstName}`
}
