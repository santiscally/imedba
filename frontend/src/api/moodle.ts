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

type Empty = Record<string, never>

export const moodleApi = {
  status(): Promise<MoodleStatus> {
    return apiGet<MoodleStatus>('/moodle/status')
  },
  linkStudent(studentId: string): Promise<MoodleLinkResult> {
    return apiPost<MoodleLinkResult, Empty>(`/moodle/students/${studentId}/link`, {})
  },
  linkAll(): Promise<MoodleLinkSummary> {
    return apiPost<MoodleLinkSummary, Empty>('/moodle/link-all', {})
  },
}
