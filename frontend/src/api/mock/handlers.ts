import type { PageResponse } from '../../types/common'
import type {
  Student,
  StudentCreateRequest,
  StudentUpdateRequest,
} from '../../types/student'
import { MOCK_STUDENTS } from './students.data'
import { MOCK_COURSES } from './courses.data'
import { MOCK_ENROLLMENTS } from './enrollments.data'
import { MOCK_INSTALLMENTS } from './installments.data'
import { MOCK_PAYMENTS } from './payments.data'
import type { Course, CourseCreateRequest, CourseUpdateRequest } from '../../types/course'
import type {
  Enrollment,
  EnrollmentCreateRequest,
  EnrollmentUpdateRequest,
  EnrollmentStatus,
} from '../../types/enrollment'
import type {
  Installment,
  InstallmentStatus,
} from '../../types/installment'
import type { Payment, PaymentCreateRequest } from '../../types/payment'

// Router de mocks: interpreta método + path + query string y devuelve
// respuestas con la misma forma (PageResponse, lista, objeto) que el backend.
//
// Cuando el backend esté vivo y VITE_USE_MOCK=false, este archivo queda muerto
// y se puede borrar. No se toca client.ts salvo por el flag.

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

let studentsStore:    Student[]    = [...MOCK_STUDENTS]
let coursesStore:     Course[]     = [...MOCK_COURSES]
let enrollmentsStore: Enrollment[] = [...MOCK_ENROLLMENTS]
let installmentsStore: Installment[] = [...MOCK_INSTALLMENTS]
let paymentsStore:     Payment[]     = [...MOCK_PAYMENTS]

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

function matchEnrollment(en: Enrollment, q: string): boolean {
  const needle = q.toLowerCase()
  return (
    en.student.firstName.toLowerCase().includes(needle) ||
    en.student.lastName.toLowerCase().includes(needle)  ||
    en.student.email.toLowerCase().includes(needle)     ||
    en.course.name.toLowerCase().includes(needle)       ||
    (en.course.code?.toLowerCase().includes(needle) ?? false)
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

  // ═══════ ENROLLMENTS ═══════
  if (pathname === '/enrollments') {
    if (method === 'GET') {
      const q         = params.get('q')?.trim() ?? ''
      const studentId = params.get('studentId') ?? ''
      const courseId  = params.get('courseId')  ?? ''
      const status    = params.get('status')    ?? ''
      const page      = Number(params.get('page') ?? 0)
      const size      = Number(params.get('size') ?? 20)
      const sort      = params.get('sort')

      let items = enrollmentsStore
      if (q)         items = items.filter(en => matchEnrollment(en, q))
      if (studentId) items = items.filter(en => en.student.id === studentId)
      if (courseId)  items = items.filter(en => en.course.id  === courseId)
      if (status)    items = items.filter(en => en.status === status as EnrollmentStatus)

      items = applySort(items, sort, {
        enrollmentDate: (en: Enrollment) => en.enrollmentDate,
        createdAt:      (en: Enrollment) => en.createdAt,
        status:         (en: Enrollment) => en.status,
        studentLastName:(en: Enrollment) => en.student.lastName,
        courseName:     (en: Enrollment) => en.course.name,
        totalPrice:     (en: Enrollment) => en.totalPrice,
      })

      return delay(buildPage(items, page, size) as unknown as T)
    }
    if (method === 'POST') {
      return delay(createEnrollment(body as EnrollmentCreateRequest) as unknown as T)
    }
  }

  const enrollmentMatch = pathname.match(/^\/enrollments\/([a-f0-9-]+)$/i)
  if (enrollmentMatch) {
    const id = enrollmentMatch[1]
    const idx = enrollmentsStore.findIndex(en => en.id === id)
    if (idx < 0) return reject('HTTP 404', 404)

    if (method === 'GET')    return delay(enrollmentsStore[idx] as unknown as T)
    if (method === 'PUT')    return delay(updateEnrollment(id, body as EnrollmentUpdateRequest) as unknown as T)
    if (method === 'DELETE') { enrollmentsStore.splice(idx, 1); return delay(undefined as unknown as T) }
  }

  const enrollmentActionMatch = pathname.match(/^\/enrollments\/([a-f0-9-]+)\/(suspend|reactivate|cancel)$/i)
  if (enrollmentActionMatch && method === 'PUT') {
    const [, id, action] = enrollmentActionMatch
    const idx = enrollmentsStore.findIndex(en => en.id === id)
    if (idx < 0) return reject('HTTP 404', 404)
    const nextStatus: EnrollmentStatus =
      action === 'suspend'    ? 'SUSPENDED' :
      action === 'reactivate' ? 'ACTIVE'    : 'CANCELLED'
    const updated: Enrollment = {
      ...enrollmentsStore[idx],
      status:    nextStatus,
      updatedAt: new Date().toISOString(),
    }
    enrollmentsStore[idx] = updated
    return delay(updated as unknown as T)
  }

  // ═══════ INSTALLMENTS ═══════
  if (pathname === '/installments' && method === 'GET') {
    const q            = params.get('q')?.trim() ?? ''
    const enrollmentId = params.get('enrollmentId') ?? ''
    const studentId    = params.get('studentId')    ?? ''
    const status       = params.get('status')       ?? ''
    const dueFrom      = params.get('dueFrom')      ?? ''
    const dueTo        = params.get('dueTo')        ?? ''
    const page         = Number(params.get('page') ?? 0)
    const size         = Number(params.get('size') ?? 20)
    const sort         = params.get('sort')

    let items = installmentsStore
    if (q) {
      const needle = q.toLowerCase()
      items = items.filter(i =>
        i.enrollment.studentLastName.toLowerCase().includes(needle) ||
        i.enrollment.studentFirstName.toLowerCase().includes(needle) ||
        i.enrollment.courseName.toLowerCase().includes(needle) ||
        (i.enrollment.courseCode?.toLowerCase().includes(needle) ?? false)
      )
    }
    if (enrollmentId) items = items.filter(i => i.enrollment.id        === enrollmentId)
    if (studentId)    items = items.filter(i => i.enrollment.studentId === studentId)
    if (status)       items = items.filter(i => i.status === status as InstallmentStatus)
    if (dueFrom)      items = items.filter(i => i.dueDate >= dueFrom)
    if (dueTo)        items = items.filter(i => i.dueDate <= dueTo)

    items = applySort(items, sort, {
      dueDate:         (i: Installment) => i.dueDate,
      number:          (i: Installment) => i.number,
      totalDue:        (i: Installment) => i.totalDue,
      status:          (i: Installment) => i.status,
      studentLastName: (i: Installment) => i.enrollment.studentLastName,
      courseName:      (i: Installment) => i.enrollment.courseName,
    })

    return delay(buildPage(items, page, size) as unknown as T)
  }

  const installmentByEnrollment = pathname.match(/^\/installments\/by-enrollment\/([a-f0-9-]+)$/i)
  if (installmentByEnrollment && method === 'GET') {
    const enrId = installmentByEnrollment[1]
    const items = installmentsStore.filter(i => i.enrollment.id === enrId)
    items.sort((a, b) => a.number - b.number)
    return delay(items as unknown as T)
  }

  const installmentMatch = pathname.match(/^\/installments\/([a-f0-9-]+)$/i)
  if (installmentMatch && method === 'GET') {
    const id = installmentMatch[1]
    const found = installmentsStore.find(i => i.id === id)
    if (!found) return reject('HTTP 404', 404)
    return delay(found as unknown as T)
  }

  const waiveMatch = pathname.match(/^\/installments\/([a-f0-9-]+)\/waive-surcharge$/i)
  if (waiveMatch && method === 'PUT') {
    const id = waiveMatch[1]
    const idx = installmentsStore.findIndex(i => i.id === id)
    if (idx < 0) return reject('HTTP 404', 404)
    const cur = installmentsStore[idx]
    const updated: Installment = {
      ...cur,
      surcharge: 0,
      totalDue:  cur.baseAmount,
      updatedAt: new Date().toISOString(),
    }
    installmentsStore[idx] = updated
    return delay(updated as unknown as T)
  }

  // ═══════ PAYMENTS ═══════
  if (pathname === '/payments') {
    if (method === 'GET') {
      const q             = params.get('q')?.trim() ?? ''
      const enrollmentId  = params.get('enrollmentId')  ?? ''
      const studentId     = params.get('studentId')     ?? ''
      const paymentMethod = params.get('paymentMethod') ?? ''
      const dateFrom      = params.get('dateFrom')      ?? ''
      const dateTo        = params.get('dateTo')        ?? ''
      const page          = Number(params.get('page') ?? 0)
      const size          = Number(params.get('size') ?? 20)
      const sort          = params.get('sort')

      let items = paymentsStore
      if (q) {
        const needle = q.toLowerCase()
        items = items.filter(p =>
          p.enrollment.studentLastName.toLowerCase().includes(needle) ||
          p.enrollment.studentFirstName.toLowerCase().includes(needle) ||
          p.enrollment.courseName.toLowerCase().includes(needle) ||
          p.receiptNumber.toLowerCase().includes(needle)
        )
      }
      if (enrollmentId)  items = items.filter(p => p.enrollment.id        === enrollmentId)
      if (studentId)     items = items.filter(p => p.enrollment.studentId === studentId)
      if (paymentMethod) items = items.filter(p => p.paymentMethod === paymentMethod)
      if (dateFrom)      items = items.filter(p => p.paymentDate >= dateFrom)
      if (dateTo)        items = items.filter(p => p.paymentDate <= dateTo)

      items = applySort(items, sort, {
        paymentDate:     (p: Payment) => p.paymentDate,
        amount:          (p: Payment) => p.amount,
        paymentMethod:   (p: Payment) => p.paymentMethod,
        studentLastName: (p: Payment) => p.enrollment.studentLastName,
        courseName:      (p: Payment) => p.enrollment.courseName,
        receiptNumber:   (p: Payment) => p.receiptNumber,
      })

      return delay(buildPage(items, page, size) as unknown as T)
    }
    if (method === 'POST') {
      return delay(createPayment(body as PaymentCreateRequest) as unknown as T)
    }
  }

  const paymentMatch = pathname.match(/^\/payments\/([a-f0-9-]+)$/i)
  if (paymentMatch && method === 'GET') {
    const id = paymentMatch[1]
    const found = paymentsStore.find(p => p.id === id)
    if (!found) return reject('HTTP 404', 404)
    return delay(found as unknown as T)
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

function createEnrollment(data: EnrollmentCreateRequest): Enrollment {
  const now = new Date().toISOString()
  const student = studentsStore.find(s => s.id === data.studentId)
  const course  = coursesStore.find(c => c.id === data.courseId)
  if (!student || !course) {
    throw new Error('Alumno o curso inexistente')
  }
  const listPrice  = data.listPrice ?? course.coursePrice ?? 0
  const discount   = data.discountPercentage ?? 0
  const bookPrice  = data.bookPrice ?? 0
  const finalPrice = Math.round(listPrice * (1 - discount / 100))
  const totalPrice = finalPrice + bookPrice

  const created: Enrollment = {
    id: crypto.randomUUID(),
    student: {
      id: student.id, firstName: student.firstName,
      lastName: student.lastName, email: student.email,
    },
    course: {
      id: course.id, name: course.name, code: course.code,
    },
    discountCampaignId: data.discountCampaignId ?? null,
    enrolledBy:         null,
    enrollmentDate:     data.enrollmentDate ?? now,
    listPrice,
    discountPercentage: discount,
    finalPrice,
    bookPrice,
    totalPrice,
    enrollmentFee:      data.enrollmentFee ?? course.enrollmentPrice ?? null,
    numInstallments:    data.numInstallments ?? null,
    paymentMethod:      data.paymentMethod ?? null,
    contractFilePath:   data.contractFilePath ?? null,
    contractSentAt:     null,
    contractSignedAt:   null,
    status:             'ACTIVE',
    moodleStatus:       'PENDING',
    notes:              data.notes ?? null,
    createdAt:          now,
    updatedAt:          now,
  }
  enrollmentsStore = [created, ...enrollmentsStore]
  return created
}

function updateEnrollment(id: string, data: EnrollmentUpdateRequest): Enrollment {
  const idx = enrollmentsStore.findIndex(en => en.id === id)
  const current = enrollmentsStore[idx]
  const listPrice  = data.listPrice          ?? current.listPrice  ?? 0
  const discount   = data.discountPercentage ?? current.discountPercentage ?? 0
  const bookPrice  = data.bookPrice          ?? current.bookPrice  ?? 0
  const finalPrice = Math.round(listPrice * (1 - discount / 100))
  const totalPrice = finalPrice + bookPrice

  const updated: Enrollment = {
    ...current,
    discountCampaignId: data.discountCampaignId ?? current.discountCampaignId,
    listPrice,
    discountPercentage: discount,
    bookPrice,
    finalPrice,
    totalPrice,
    enrollmentFee:      data.enrollmentFee    ?? current.enrollmentFee,
    numInstallments:    data.numInstallments  ?? current.numInstallments,
    paymentMethod:      data.paymentMethod    ?? current.paymentMethod,
    contractFilePath:   data.contractFilePath ?? current.contractFilePath,
    contractSentAt:     data.contractSentAt   ?? current.contractSentAt,
    contractSignedAt:   data.contractSignedAt ?? current.contractSignedAt,
    notes:              data.notes            ?? current.notes,
    updatedAt:          new Date().toISOString(),
  }
  enrollmentsStore[idx] = updated
  return updated
}

// ─── Payments + Installments ─────────────────────────────────────────────────
let paymentReceiptCounter = 1000
function nextReceipt(date: string): string {
  const compact = date.replace(/-/g, '')
  const seq = (paymentReceiptCounter++).toString().padStart(6, '0')
  return `IMD-${compact}-${seq}`
}

function createPayment(data: PaymentCreateRequest): Payment {
  let installmentRef: Installment | null = null
  let enrollmentId = data.enrollmentId ?? null

  if (data.installmentId) {
    installmentRef = installmentsStore.find(i => i.id === data.installmentId) ?? null
    if (!installmentRef) throw new Error('Cuota inexistente')
    enrollmentId = installmentRef.enrollment.id
  }

  if (!enrollmentId) throw new Error('Debe especificarse installmentId o enrollmentId')

  const enr = enrollmentsStore.find(e => e.id === enrollmentId)
  if (!enr) throw new Error('Inscripción inexistente')

  const today       = new Date().toISOString().slice(0, 10)
  const paymentDate = data.paymentDate ?? today
  const created: Payment = {
    id: crypto.randomUUID(),
    enrollment: {
      id:               enr.id,
      studentId:        enr.student.id,
      studentFirstName: enr.student.firstName,
      studentLastName:  enr.student.lastName,
      courseId:         enr.course.id,
      courseName:       enr.course.name,
    },
    installmentId:     installmentRef?.id     ?? null,
    installmentNumber: installmentRef?.number ?? null,
    receiptNumber:     nextReceipt(paymentDate),
    paymentMethod:     data.paymentMethod,
    amount:            data.amount,
    paymentDate,
    notes:             data.notes ?? null,
    createdAt:         new Date().toISOString(),
  }
  paymentsStore = [created, ...paymentsStore]

  // Si pagó una cuota, marcarla como PAID
  if (installmentRef) {
    const idx = installmentsStore.findIndex(i => i.id === installmentRef!.id)
    if (idx >= 0) {
      installmentsStore[idx] = {
        ...installmentsStore[idx],
        status:    'PAID',
        paidAt:    new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
  }

  return created
}
