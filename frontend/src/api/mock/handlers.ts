import type { PageResponse } from '../../types/common'
import type {
  Student,
  StudentCreateRequest,
  StudentUpdateRequest,
} from '../../types/student'
import { MOCK_STUDENTS } from './students.data'
import { MOCK_COURSES } from './courses.data'
import type { Course, CourseCreateRequest, CourseUpdateRequest } from '../../types/course'

// Router de mocks: interpreta método + path + query string y devuelve
// respuestas con la misma forma (PageResponse, lista, objeto) que el backend.
//
// Cuando el backend esté vivo y VITE_USE_MOCK=false, este archivo queda muerto
// y se puede borrar. No se toca client.ts salvo por el flag.

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

let studentsStore: Student[] = [...MOCK_STUDENTS]
let coursesStore:  Course[]  = [...MOCK_COURSES]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildPage<T>(items: T[], page: number, size: number): PageResponse<T> {
  const totalElements = items.length
  const totalPages    = Math.max(1, Math.ceil(totalElements / size))
  const start         = page * size
  const content       = items.slice(start, start + size)
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last:  page >= totalPages - 1,
  }
}

function parseUrl(path: string): { pathname: string; params: URLSearchParams } {
  const [rawPath, rawQuery = ''] = path.split('?')
  return { pathname: rawPath, params: new URLSearchParams(rawQuery) }
}

function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

function reject(msg: string, status = 404): Promise<never> {
  const err = new Error(msg) as Error & { status?: number }
  err.status = status
  return new Promise((_, rej) => setTimeout(() => rej(err), 180))
}

// "lastName,asc" → aplica un sort estable sobre el array
function applySort<T>(items: T[], sort: string | null, keyMap: Record<string, (x: T) => unknown>): T[] {
  if (!sort) return items
  const [rawField, rawDir = 'asc'] = sort.split(',')
  const extractor = keyMap[rawField]
  if (!extractor) return items
  const dir = rawDir === 'desc' ? -1 : 1
  return [...items].sort((a, b) => {
    const va = extractor(a), vb = extractor(b)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'boolean' && typeof vb === 'boolean') {
      return (Number(vb) - Number(va)) * dir
    }
    return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }) * dir
  })
}

function matchStudent(s: Student, q: string): boolean {
  const needle = q.toLowerCase()
  return (
    s.firstName.toLowerCase().includes(needle) ||
    s.lastName.toLowerCase().includes(needle)  ||
    s.email.toLowerCase().includes(needle)     ||
    (s.dni?.toLowerCase().includes(needle) ?? false)
  )
}

function matchCourse(c: Course, q: string): boolean {
  const needle = q.toLowerCase()
  return (
    c.name.toLowerCase().includes(needle) ||
    (c.code?.toLowerCase().includes(needle) ?? false) ||
    (c.modality?.toLowerCase().includes(needle) ?? false)
  )
}

// ─── Router principal ────────────────────────────────────────────────────────
export function mockFetch<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const { pathname, params } = parseUrl(path)

  // ═══════ STUDENTS ═══════
  if (pathname === '/students') {
    if (method === 'GET') {
      const q    = params.get('q')?.trim() ?? ''
      const page = Number(params.get('page') ?? 0)
      const size = Number(params.get('size') ?? 20)
      const sort = params.get('sort')

      let items = q ? studentsStore.filter(s => matchStudent(s, q)) : studentsStore
      items = applySort(items, sort, {
        firstName:  (s: Student) => s.firstName,
        lastName:   (s: Student) => s.lastName,
        university: (s: Student) => s.university,
        active:     (s: Student) => s.active,
        createdAt:  (s: Student) => s.createdAt,
      })

      return delay(buildPage(items, page, size) as unknown as T)
    }
    if (method === 'POST') {
      return delay(createStudent(body as StudentCreateRequest) as unknown as T)
    }
  }

  const studentMatch = pathname.match(/^\/students\/([a-f0-9-]+)$/i)
  if (studentMatch) {
    const id = studentMatch[1]
    const idx = studentsStore.findIndex(s => s.id === id)
    if (idx < 0) return reject('HTTP 404', 404)

    if (method === 'GET')    return delay(studentsStore[idx] as unknown as T)
    if (method === 'PUT')    return delay(updateStudent(id, body as StudentUpdateRequest) as unknown as T)
    if (method === 'DELETE') { studentsStore.splice(idx, 1); return delay(undefined as unknown as T) }
  }

  // ═══════ COURSES ═══════
  if (pathname === '/courses') {
    if (method === 'GET') {
      const q            = params.get('q')?.trim() ?? ''
      const businessUnit = params.get('businessUnit') ?? ''
      const activeParam  = params.get('active')
      const active       = activeParam === null ? null : activeParam === 'true'
      const page         = Number(params.get('page') ?? 0)
      const size         = Number(params.get('size') ?? 20)
      const sort         = params.get('sort')

      let items = coursesStore
      if (q)            items = items.filter(c => matchCourse(c, q))
      if (businessUnit) items = items.filter(c => c.businessUnit === businessUnit)
      if (active !== null) items = items.filter(c => c.active === active)

      items = applySort(items, sort, {
        name:         (c: Course) => c.name,
        modality:     (c: Course) => c.modality,
        businessUnit: (c: Course) => c.businessUnit,
        coursePrice:  (c: Course) => c.coursePrice,
        active:       (c: Course) => c.active,
      })

      return delay(buildPage(items, page, size) as unknown as T)
    }
    if (method === 'POST') {
      return delay(createCourse(body as CourseCreateRequest) as unknown as T)
    }
  }

  const courseMatch = pathname.match(/^\/courses\/([a-f0-9-]+)$/i)
  if (courseMatch) {
    const id = courseMatch[1]
    const idx = coursesStore.findIndex(c => c.id === id)
    if (idx < 0) return reject('HTTP 404', 404)

    if (method === 'GET')    return delay(coursesStore[idx] as unknown as T)
    if (method === 'PUT')    return delay(updateCourse(id, body as CourseUpdateRequest) as unknown as T)
    if (method === 'DELETE') { coursesStore.splice(idx, 1); return delay(undefined as unknown as T) }
  }

  // Dashboard y otros: sin mock → reject → useFetch muestra empty state.
  return reject(`Mock no implementado: ${method} ${pathname}`, 501)
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────
function createStudent(data: StudentCreateRequest): Student {
  const now = new Date().toISOString()
  const created: Student = {
    id:           crypto.randomUUID(),
    firstName:    data.firstName,
    lastName:     data.lastName,
    email:        data.email,
    phone:        data.phone        ?? null,
    dni:          data.dni          ?? null,
    nationality:  data.nationality  ?? null,
    university:   data.university   ?? null,
    locality:     data.locality     ?? null,
    active:       data.active       ?? true,
    moodleUserId: null,
    notes:        data.notes        ?? null,
    createdAt:    now,
    updatedAt:    now,
  }
  studentsStore = [created, ...studentsStore]
  return created
}

function updateStudent(id: string, data: StudentUpdateRequest): Student {
  const idx = studentsStore.findIndex(s => s.id === id)
  const current = studentsStore[idx]
  const updated: Student = {
    ...current,
    firstName:   data.firstName,
    lastName:    data.lastName,
    email:       data.email,
    phone:       data.phone        ?? null,
    dni:         data.dni          ?? null,
    nationality: data.nationality  ?? null,
    university:  data.university   ?? null,
    locality:    data.locality     ?? null,
    active:      data.active       ?? current.active,
    notes:       data.notes        ?? null,
    updatedAt:   new Date().toISOString(),
  }
  studentsStore[idx] = updated
  return updated
}

function createCourse(data: CourseCreateRequest): Course {
  const now = new Date().toISOString()
  const created: Course = {
    id:                   crypto.randomUUID(),
    name:                 data.name,
    code:                 data.code                 ?? null,
    description:          data.description          ?? null,
    businessUnit:         data.businessUnit,
    modality:             data.modality             ?? null,
    enrollmentPrice:      data.enrollmentPrice      ?? null,
    coursePrice:          data.coursePrice          ?? null,
    examDate:             data.examDate             ?? null,
    contractTemplatePath: data.contractTemplatePath ?? null,
    moodleCourseId:       data.moodleCourseId       ?? null,
    active:               data.active ?? true,
    createdAt:            now,
    updatedAt:            now,
  }
  coursesStore = [created, ...coursesStore]
  return created
}

function updateCourse(id: string, data: CourseUpdateRequest): Course {
  const idx = coursesStore.findIndex(c => c.id === id)
  const current = coursesStore[idx]
  const updated: Course = {
    ...current,
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  }
  coursesStore[idx] = updated
  return updated
}
