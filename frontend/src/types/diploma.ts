import type { Instant, UUID } from './common'
import type { Modality } from './course'

/**
 * Directora de la diplomatura. Viene de Personal Académico (staff con rol
 * DIRECTORA). **Sin porcentaje**: se reparten en partes iguales la mitad del
 * subtotal 2 menos las grabaciones docentes.
 *
 * Antes se pedía un «% de la directora» al crear la diplomatura; el cliente lo
 * bajó el 2026-07-23.
 */
export interface DirectorRef {
  id:    UUID
  name:  string
  email: string | null
}

// Refleja CommissionResponse: `id` es el del curso FS al que se inscriben los alumnos.
export interface Commission {
  id:                UUID
  name:              string
  commission:        number | null  // null = curso espejo viejo (pre-V044) sin número todavía
  academicYear:      number | null
  enrollmentPrice:   number | null
  coursePrice:       number | null
  includesPremaBook: boolean | null
  startDate:         string | null   // ISO yyyy-mm-dd
  endDate:           string | null
  modality:          Modality | null
  moodleCourseId:    number | null
  active:            boolean | null
}

// Refleja CommissionRequest
export interface CommissionRequest {
  commission:         number
  academicYear?:      number | null
  enrollmentPrice?:   number | null
  coursePrice?:       number | null
  includesPremaBook?: boolean | null
  startDate?:         string | null
  endDate?:           string | null
  modality?:          Modality | null
  moodleCourseId?:    number | null
  active?:            boolean | null
}

// Refleja DiplomaResponse: la diplomatura es el programa general; precios, libro y fechas van por comisión.
export interface Diploma {
  id:             UUID
  name:           string
  universityName: string | null
  description:    string | null
  directors:      DirectorRef[]
  commissions:    Commission[]    // de la más nueva a la más vieja
  active:         boolean | null
  createdAt:      Instant
  updatedAt:      Instant
}

// Refleja DiplomaCreateRequest
export interface DiplomaCreateRequest {
  name:             string          // required, max 300
  universityName?:  string | null   // max 200
  description?:     string | null
  /** Ids de Personal Académico con rol DIRECTORA. */
  directorIds?:     UUID[] | null
  firstCommission?: CommissionRequest | null
}

// Refleja DiplomaUpdateRequest. `directorIds` en null = no tocar; lista (incluso vacía) = reemplaza el set.
export interface DiplomaUpdateRequest {
  name?:           string | null
  universityName?: string | null
  description?:    string | null
  directorIds?:    UUID[] | null
  active?:         boolean | null
}
