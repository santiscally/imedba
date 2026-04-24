import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.student.dto.StudentResponse
export interface Student {
  id:            UUID
  firstName:     string
  lastName:      string
  email:         string
  phone:         string | null
  dni:           string | null
  nationality:   string | null
  university:    string | null
  locality:      string | null
  active:        boolean | null
  moodleUserId:  number | null
  notes:         string | null
  createdAt:     Instant
  updatedAt:     Instant
}

// Refleja com.imedba.modules.student.dto.StudentCreateRequest
export interface StudentCreateRequest {
  firstName:   string          // required, max 100
  lastName:    string          // required, max 100
  email:       string          // required, email, max 255
  phone?:      string | null   // max 50
  dni?:        string | null   // max 20
  nationality?: string | null  // max 100
  university?: string | null   // max 200
  locality?:   string | null   // max 200
  active?:     boolean
  notes?:      string | null
}

// Refleja com.imedba.modules.student.dto.StudentUpdateRequest (idéntico a Create)
export type StudentUpdateRequest = StudentCreateRequest

// ⚠️ NOTA: el Excel tiene columnas que NO están modeladas en el backend:
//   - interview_status      → estado de entrevista previa (falta en enrollments)
//   - Ausente plat NOV/ENE  → ausencias Moodle (futura integración LMS)
//   - Pago chq              → CHEQUE no está en enum payment_method
