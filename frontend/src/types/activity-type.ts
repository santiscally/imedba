import type { UUID } from './common'

// Refleja com.imedba.modules.activitytype.dto.*
// Catálogo de valores hora: es de donde salen los $75.000 de docente y los
// $6.500 de preceptora que usa la liquidación (V037).

/** A qué rol aplica la tarifa. `ALL` = a cualquiera. */
export type AppliesTo = 'DOCENTE' | 'PRECEPTORA' | 'DIRECTORA' | 'ALL'

export const APPLIES_TO: AppliesTo[] = ['DOCENTE', 'PRECEPTORA', 'DIRECTORA', 'ALL']

export const APPLIES_TO_LABELS: Record<AppliesTo, string> = {
  DOCENTE:    'Docentes',
  PRECEPTORA: 'Preceptoras',
  DIRECTORA:  'Directoras',
  ALL:        'Todos',
}

export interface ActivityType {
  id:          UUID
  name:        string
  ratePerHour: number
  appliesTo:   AppliesTo | null
  active:      boolean | null
}

export interface ActivityTypeCreateRequest {
  name:        string
  ratePerHour: number
  appliesTo?:  AppliesTo | null
}

export interface ActivityTypeUpdateRequest {
  name?:        string | null
  ratePerHour?: number | null
  appliesTo?:   AppliesTo | null
  active?:      boolean | null
}

/**
 * Nombres que busca la liquidación docente (TeachingSettlementService). Si se
 * renombran desde la UI, la liquidación deja de encontrar la tarifa y pide que se
 * cargue el valor a mano.
 */
export const RATE_DOCENTE = 'Hora docente'
export const RATE_PRECEPTORA = 'Hora preceptora'
