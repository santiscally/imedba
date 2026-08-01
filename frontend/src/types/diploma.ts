import type { Instant, UUID } from './common'

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

// Refleja com.imedba.modules.diploma.dto.DiplomaResponse (V035).
// Los costos y porcentajes de la liquidación NO viven acá: se cargan al liquidar.
export interface Diploma {
  id:              UUID
  name:            string
  universityName:  string | null
  // La diplomatura ES un curso: el backend crea/sincroniza automáticamente su curso
  // espejo en FS (V026 + decisión 2026-06-09). Los alumnos se inscriben a ese curso.
  courseId:        UUID | null
  courseName:      string | null
  description:     string | null
  enrollmentPrice: number | null   // BigDecimal en backend
  coursePrice:     number | null
  directors:       DirectorRef[]
  active:          boolean | null
  createdAt:       Instant
  updatedAt:       Instant
}

// Refleja com.imedba.modules.diploma.dto.DiplomaCreateRequest
export interface DiplomaCreateRequest {
  name:             string          // required, max 300
  universityName?:  string | null   // max 200
  description?:     string | null
  enrollmentPrice?: number | null   // ≥ 0
  coursePrice?:     number | null
  /** Ids de Personal Académico con rol DIRECTORA. */
  directorIds?:     UUID[] | null
}

// Refleja DiplomaUpdateRequest: igual que create + active.
// `directorIds` en null = no tocar; lista (incluso vacía) = reemplaza el set.
export interface DiplomaUpdateRequest extends DiplomaCreateRequest {
  active?: boolean | null
}
