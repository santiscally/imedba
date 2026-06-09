import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.diploma.dto.PartnerConfigDto
export interface PartnerConfig {
  name:  string
  pct:   number          // 0–100
  email: string | null
}

// Refleja com.imedba.modules.diploma.dto.DiplomaResponse
export interface Diploma {
  id:                 UUID
  name:               string
  universityName:     string | null
  // La diplomatura ES un curso: el backend crea/sincroniza automáticamente su curso
  // espejo en FS (V026 + decisión 2026-06-09). Los alumnos se inscriben a ese curso.
  courseId:           UUID | null
  courseName:         string | null
  description:        string | null
  enrollmentPrice:    number | null   // BigDecimal en backend
  coursePrice:        number | null
  taxCommissionPct:   number | null   // 0–100
  secretarySalary:    number | null
  advertisingAmount:  number | null
  adminPct:           number | null   // 0–100
  universityPct:      number | null   // 0–100
  imedbaPct:          number | null   // 0–100
  partnersConfig:     PartnerConfig[] | null
  active:             boolean | null
  createdAt:          Instant
  updatedAt:          Instant
}

// Refleja com.imedba.modules.diploma.dto.DiplomaCreateRequest
export interface DiplomaCreateRequest {
  name:                string                  // required, max 300
  universityName?:     string | null           // max 200
  description?:        string | null
  enrollmentPrice?:    number | null           // ≥ 0
  coursePrice?:        number | null
  taxCommissionPct?:   number | null           // 0–100
  secretarySalary?:    number | null
  advertisingAmount?:  number | null
  adminPct?:           number | null           // 0–100
  universityPct?:      number | null           // 0–100
  imedbaPct?:          number | null           // 0–100
  partnersConfig?:     PartnerConfig[] | null
}

// Update idéntico a Create
export type DiplomaUpdateRequest = DiplomaCreateRequest
