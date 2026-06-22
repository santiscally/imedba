import { apiGet, apiPost } from './client'

// Servicio de integración Moodle — refleja MoodleController del backend (/api/v1/moodle).
// El vínculo alumno↔Moodle es por email: los alumnos se dan de alta acá independientes
// de Moodle, así que el email es la clave común.

export interface MoodleStatus {
  enabled:    boolean   // feature flag MOODLE_ENABLED
  configured: boolean   // además tiene URL + token cargados
}

export interface MoodleLinkResult {
  studentId:    string
  email:        string
  linked:       boolean
  moodleUserId: number | null
  message:      string
}

export interface MoodleLinkSummary {
  processed: number
  linked:    number
  notFound:  number
  results:   MoodleLinkResult[]
}

// Resultado de validar un email sin alumno persistido (botón "Validar con Moodle" del alta).
export interface MoodleLookupResult {
  enabled:      boolean
  found:        boolean
  moodleUserId: number | null
  fullname:     string | null
  suspended:    boolean | null
  message:      string
}

// Cuenta de Moodle tal como la devuelve core_user_get_users_by_field (suspended: 1/0).
export interface MoodleAccount {
  id:        number | null
  username:  string | null
  firstname: string | null
  lastname:  string | null
  fullname:  string | null
  email:     string | null
  suspended: number | null
}

// Fila del export de alumnos no vinculados (con sus cursos inscriptos).
export interface UnlinkedStudentRow {
  studentId: string
  firstName: string
  lastName:  string
  email:     string
  dni:       string | null
  phone:     string | null
  courses:   string[]
}

type Empty = Record<string, never>

export const moodleApi = {
  status(): Promise<MoodleStatus> {
    return apiGet<MoodleStatus>('/moodle/status')
  },
  // Valida un email contra Moodle SIN crear nada (alta de alumno).
  lookup(email: string): Promise<MoodleLookupResult> {
    return apiGet<MoodleLookupResult>(`/moodle/lookup?email=${encodeURIComponent(email)}`)
  },
  linkStudent(studentId: string): Promise<MoodleLinkResult> {
    return apiPost<MoodleLinkResult, Empty>(`/moodle/students/${studentId}/link`, {})
  },
  linkAll(): Promise<MoodleLinkSummary> {
    return apiPost<MoodleLinkSummary, Empty>('/moodle/link-all', {})
  },
  // Estado vivo de la cuenta (para decidir Suspender vs Reactivar). 204 → null.
  account(studentId: string): Promise<MoodleAccount | null> {
    return apiGet<MoodleAccount | null>(`/moodle/students/${studentId}/account`)
      .then(r => r ?? null)
  },
  suspend(studentId: string): Promise<void> {
    return apiPost<void, Empty>(`/moodle/students/${studentId}/suspend`, {})
  },
  activate(studentId: string): Promise<void> {
    return apiPost<void, Empty>(`/moodle/students/${studentId}/activate`, {})
  },
  unlinkedStudents(): Promise<UnlinkedStudentRow[]> {
    return apiGet<UnlinkedStudentRow[]>('/moodle/unlinked-students')
  },
}
