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
import { MOCK_DISCOUNT_CAMPAIGNS } from './discount-campaigns.data'
import { MOCK_DIPLOMAS } from './diplomas.data'
import { MOCK_DIPLOMA_SETTLEMENTS } from './diploma-settlements.data'
import { MOCK_BUDGET_ENTRIES } from './budget.data'
import { MOCK_CONTACTS } from './contacts.data'
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
import type {
  DiscountCampaign,
  DiscountCampaignCreateRequest,
  DiscountCampaignUpdateRequest,
} from '../../types/discount-campaign'
import type {
  Diploma,
  DiplomaCreateRequest,
  DiplomaUpdateRequest,
} from '../../types/diploma'
import type {
  DiplomaSettlement,
  DiplomaSettlementCreateRequest,
} from '../../types/diploma-settlement'
import type {
  BudgetEntry,
  BudgetEntryCreateRequest,
  BudgetSummary,
  CategoryBreakdown,
  MonthlyFlow,
  EntryType as BudgetEntryType,
  BudgetCategory,
  BudgetBusinessUnit,
} from '../../types/budget'
import type {
  Contact,
  ContactCreateRequest,
  ContactUpdateRequest,
  ContactType,
} from '../../types/contact'

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
let discountCampaignsStore: DiscountCampaign[] = [...MOCK_DISCOUNT_CAMPAIGNS]
let diplomasStore:           Diploma[]          = [...MOCK_DIPLOMAS]
let settlementsStore:        DiplomaSettlement[] = [...MOCK_DIPLOMA_SETTLEMENTS]
let budgetEntriesStore:      BudgetEntry[]       = [...MOCK_BUDGET_ENTRIES]
let contactsStore:           Contact[]           = [...MOCK_CONTACTS]

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

// Resuelve nombre del enrollment para buscar/filtrar cuotas y pagos (forma plana).
function enrStudentId(enrollmentId: string): string | null {
  return enrollmentsStore.find(e => e.id === enrollmentId)?.student.id ?? null
}

function enrMatches(enrollmentId: string, needle: string): boolean {
  const e = enrollmentsStore.find(en => en.id === enrollmentId)
  if (!e) return false
  return (
    e.student.lastName.toLowerCase().includes(needle) ||
    e.student.firstName.toLowerCase().includes(needle) ||
    e.course.name.toLowerCase().includes(needle) ||
    (e.course.code?.toLowerCase().includes(needle) ?? false)
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
      items = items.filter(i => enrMatches(i.enrollmentId, needle))
    }
    if (enrollmentId) items = items.filter(i => i.enrollmentId === enrollmentId)
    if (studentId)    items = items.filter(i => enrStudentId(i.enrollmentId) === studentId)
    if (status)       items = items.filter(i => i.status === status as InstallmentStatus)
    if (dueFrom)      items = items.filter(i => i.dueDate >= dueFrom)
    if (dueTo)        items = items.filter(i => i.dueDate <= dueTo)

    items = applySort(items, sort, {
      dueDate:  (i: Installment) => i.dueDate,
      number:   (i: Installment) => i.number,
      totalDue: (i: Installment) => i.totalDue,
      status:   (i: Installment) => i.status,
    })

    return delay(buildPage(items, page, size) as unknown as T)
  }

  const installmentByEnrollment = pathname.match(/^\/installments\/by-enrollment\/([a-f0-9-]+)$/i)
  if (installmentByEnrollment && method === 'GET') {
    const enrId = installmentByEnrollment[1]
    const items = installmentsStore.filter(i => i.enrollmentId === enrId)
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
      surchargeAmount: 0,
      totalDue:        cur.amount,
      updatedAt:       new Date().toISOString(),
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
          enrMatches(p.enrollmentId, needle) ||
          (p.receiptNumber?.toLowerCase().includes(needle) ?? false)
        )
      }
      if (enrollmentId)  items = items.filter(p => p.enrollmentId === enrollmentId)
      if (studentId)     items = items.filter(p => enrStudentId(p.enrollmentId) === studentId)
      if (paymentMethod) items = items.filter(p => p.paymentMethod === paymentMethod)
      if (dateFrom)      items = items.filter(p => p.paymentDate >= dateFrom)
      if (dateTo)        items = items.filter(p => p.paymentDate <= dateTo)

      items = applySort(items, sort, {
        paymentDate:   (p: Payment) => p.paymentDate,
        amount:        (p: Payment) => p.amount,
        paymentMethod: (p: Payment) => p.paymentMethod,
        receiptNumber: (p: Payment) => p.receiptNumber,
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

  // ═══════ DISCOUNT CAMPAIGNS ═══════
  if (pathname === '/discount-campaigns') {
    if (method === 'GET') {
      const q           = params.get('q')?.trim() ?? ''
      const activeParam = params.get('active')
      const active      = activeParam === null ? null : activeParam === 'true'
      const page        = Number(params.get('page') ?? 0)
      const size        = Number(params.get('size') ?? 20)
      const sort        = params.get('sort')

      let items = discountCampaignsStore
      if (q) {
        const needle = q.toLowerCase()
        items = items.filter(c =>
          c.name.toLowerCase().includes(needle) ||
          (c.description?.toLowerCase().includes(needle) ?? false)
        )
      }
      if (active !== null) items = items.filter(c => c.active === active)

      items = applySort(items, sort, {
        name:         (c: DiscountCampaign) => c.name,
        discountType: (c: DiscountCampaign) => c.discountType,
        value:        (c: DiscountCampaign) => c.value,
        validFrom:    (c: DiscountCampaign) => c.validFrom,
        validTo:      (c: DiscountCampaign) => c.validTo,
        active:       (c: DiscountCampaign) => c.active,
      })

      return delay(buildPage(items, page, size) as unknown as T)
    }
    if (method === 'POST') {
      return delay(createDiscountCampaign(body as DiscountCampaignCreateRequest) as unknown as T)
    }
  }

  const discountMatch = pathname.match(/^\/discount-campaigns\/([a-f0-9-]+)$/i)
  if (discountMatch) {
    const id = discountMatch[1]
    const idx = discountCampaignsStore.findIndex(c => c.id === id)
    if (idx < 0) return reject('HTTP 404', 404)

    if (method === 'GET')    return delay(discountCampaignsStore[idx] as unknown as T)
    if (method === 'PUT')    return delay(updateDiscountCampaign(id, body as DiscountCampaignUpdateRequest) as unknown as T)
    if (method === 'DELETE') { discountCampaignsStore.splice(idx, 1); return delay(undefined as unknown as T) }
  }

  // ═══════ DIPLOMAS (List sin paginar — refleja DiplomaController) ═══════
  if (pathname === '/diplomas') {
    if (method === 'GET') {
      const onlyActiveParam = params.get('onlyActive')
      const onlyActive = onlyActiveParam === null ? null : onlyActiveParam === 'true'
      let items = diplomasStore
      if (onlyActive === true)  items = items.filter(d => d.active === true)
      if (onlyActive === false) items = items.filter(d => d.active === false)
      return delay(items as unknown as T)
    }
    if (method === 'POST') {
      return delay(createDiploma(body as DiplomaCreateRequest) as unknown as T)
    }
  }

  const diplomaDeactivate = pathname.match(/^\/diplomas\/([a-f0-9-]+)\/deactivate$/i)
  if (diplomaDeactivate && method === 'PUT') {
    const id = diplomaDeactivate[1]
    const idx = diplomasStore.findIndex(d => d.id === id)
    if (idx < 0) return reject('HTTP 404', 404)
    diplomasStore[idx] = {
      ...diplomasStore[idx],
      active:    false,
      updatedAt: new Date().toISOString(),
    }
    return delay(undefined as unknown as T)
  }

  const diplomaMatch = pathname.match(/^\/diplomas\/([a-f0-9-]+)$/i)
  if (diplomaMatch) {
    const id = diplomaMatch[1]
    const idx = diplomasStore.findIndex(d => d.id === id)
    if (idx < 0) return reject('HTTP 404', 404)

    if (method === 'GET') return delay(diplomasStore[idx] as unknown as T)
    if (method === 'PUT') return delay(updateDiploma(id, body as DiplomaUpdateRequest) as unknown as T)
  }

  // ═══════ DIPLOMA SETTLEMENTS ═══════
  if (pathname === '/diploma-settlements') {
    if (method === 'GET') {
      const diplomaId = params.get('diplomaId') ?? ''
      if (!diplomaId) return reject('diplomaId requerido', 400)
      const items = settlementsStore
        .filter(s => s.diplomaId === diplomaId)
        .slice()
        .sort((a, b) => (b.periodYear - a.periodYear) || (b.periodMonth - a.periodMonth))
      return delay(items as unknown as T)
    }
    if (method === 'POST') {
      return delay(createSettlement(body as DiplomaSettlementCreateRequest) as unknown as T)
    }
  }

  const settlementAction = pathname.match(/^\/diploma-settlements\/([a-f0-9-]+)\/(recompute|approve|mark-paid)$/i)
  if (settlementAction && method === 'PUT') {
    const [, id, action] = settlementAction
    const idx = settlementsStore.findIndex(s => s.id === id)
    if (idx < 0) return reject('HTTP 404', 404)
    const cur = settlementsStore[idx]
    let next: DiplomaSettlement
    if (action === 'recompute') {
      if (cur.status !== 'DRAFT') return reject('Solo se puede recomputar en estado DRAFT', 409)
      next = { ...computeSettlement(cur.diplomaId, cur.periodMonth, cur.periodYear, cur.totalCollected, cur.id, cur.createdAt), status: 'DRAFT' }
    } else if (action === 'approve') {
      if (cur.status !== 'DRAFT') return reject('Solo se puede aprobar desde DRAFT', 409)
      next = { ...cur, status: 'APPROVED', updatedAt: new Date().toISOString() }
    } else {
      if (cur.status !== 'APPROVED') return reject('Solo se puede pagar desde APPROVED', 409)
      next = { ...cur, status: 'PAID', updatedAt: new Date().toISOString() }
    }
    settlementsStore[idx] = next
    return delay(next as unknown as T)
  }

  const settlementMatch = pathname.match(/^\/diploma-settlements\/([a-f0-9-]+)$/i)
  if (settlementMatch && method === 'GET') {
    const id = settlementMatch[1]
    const found = settlementsStore.find(s => s.id === id)
    if (!found) return reject('HTTP 404', 404)
    return delay(found as unknown as T)
  }

  // ═══════ BUDGET ═══════
  if (pathname === '/budget/entries') {
    if (method === 'GET') {
      const type         = params.get('type')         ?? ''
      const category     = params.get('category')     ?? ''
      const businessUnit = params.get('businessUnit') ?? ''
      const from         = params.get('from')         ?? ''
      const to           = params.get('to')           ?? ''
      const projectedRaw = params.get('projected')
      const projected    = projectedRaw === null ? null : projectedRaw === 'true'
      const page         = Number(params.get('page') ?? 0)
      const size         = Number(params.get('size') ?? 20)
      const sort         = params.get('sort')

      let items = budgetEntriesStore
      if (type)         items = items.filter(e => e.entryType === type as BudgetEntryType)
      if (category)     items = items.filter(e => e.category  === category as BudgetCategory)
      if (businessUnit) items = items.filter(e => e.businessUnit === businessUnit as BudgetBusinessUnit)
      if (from)         items = items.filter(e => e.entryDate >= from)
      if (to)           items = items.filter(e => e.entryDate <= to)
      if (projected !== null) items = items.filter(e => (e.projected ?? false) === projected)

      items = applySort(items, sort, {
        entryDate:    (e: BudgetEntry) => e.entryDate,
        amount:       (e: BudgetEntry) => e.amount,
        entryType:    (e: BudgetEntry) => e.entryType,
        category:     (e: BudgetEntry) => e.category,
        businessUnit: (e: BudgetEntry) => e.businessUnit,
        concept:      (e: BudgetEntry) => e.concept,
      })

      return delay(buildPage(items, page, size) as unknown as T)
    }
    if (method === 'POST') {
      return delay(createBudgetEntry(body as BudgetEntryCreateRequest) as unknown as T)
    }
  }

  const budgetEntryMatch = pathname.match(/^\/budget\/entries\/([a-f0-9-]+)$/i)
  if (budgetEntryMatch && method === 'GET') {
    const id = budgetEntryMatch[1]
    const found = budgetEntriesStore.find(e => e.id === id)
    if (!found) return reject('HTTP 404', 404)
    return delay(found as unknown as T)
  }

  if (pathname === '/budget/dashboard/summary' && method === 'GET') {
    const year  = Number(params.get('year'))
    const month = Number(params.get('month'))
    return delay(computeSummary(year, month) as unknown as T)
  }

  if (pathname === '/budget/dashboard/breakdown' && method === 'GET') {
    const year  = Number(params.get('year'))
    const month = Number(params.get('month'))
    return delay(computeBreakdown(year, month) as unknown as T)
  }

  if (pathname === '/budget/dashboard/monthly-flow' && method === 'GET') {
    const year  = Number(params.get('year'))
    return delay(computeMonthlyFlow(year) as unknown as T)
  }

  // ═══════ CONTACTS ═══════
  if (pathname === '/contacts') {
    if (method === 'GET') {
      const q           = params.get('q')?.trim() ?? ''
      const typeParam   = params.get('type') ?? ''
      const activeParam = params.get('active')
      const active      = activeParam === null ? null : activeParam === 'true'
      const page        = Number(params.get('page') ?? 0)
      const size        = Number(params.get('size') ?? 20)
      const sort        = params.get('sort')

      let items = contactsStore
      if (typeParam)        items = items.filter(c => c.contactType === typeParam as ContactType)
      if (active !== null)  items = items.filter(c => c.active === active)
      if (q) {
        const needle = q.toLowerCase()
        items = items.filter(c =>
          (c.firstName?.toLowerCase().includes(needle)       ?? false) ||
          (c.lastName?.toLowerCase().includes(needle)        ?? false) ||
          (c.companyName?.toLowerCase().includes(needle)     ?? false) ||
          (c.email?.toLowerCase().includes(needle)           ?? false) ||
          (c.roleDescription?.toLowerCase().includes(needle) ?? false)
        )
      }

      items = applySort(items, sort, {
        lastName:    (c: Contact) => c.lastName ?? c.companyName,
        companyName: (c: Contact) => c.companyName ?? c.lastName,
        firstName:   (c: Contact) => c.firstName,
        contactType: (c: Contact) => c.contactType,
        email:       (c: Contact) => c.email,
        active:      (c: Contact) => c.active,
      })

      return delay(buildPage(items, page, size) as unknown as T)
    }
    if (method === 'POST') {
      return delay(createContact(body as ContactCreateRequest) as unknown as T)
    }
  }

  const contactDeactivate = pathname.match(/^\/contacts\/([a-f0-9-]+)\/deactivate$/i)
  if (contactDeactivate && method === 'PUT') {
    const id = contactDeactivate[1]
    const idx = contactsStore.findIndex(c => c.id === id)
    if (idx < 0) return reject('HTTP 404', 404)
    contactsStore[idx] = {
      ...contactsStore[idx],
      active:    false,
      updatedAt: new Date().toISOString(),
    }
    return delay(undefined as unknown as T)
  }

  const contactMatch = pathname.match(/^\/contacts\/([a-f0-9-]+)$/i)
  if (contactMatch) {
    const id = contactMatch[1]
    const idx = contactsStore.findIndex(c => c.id === id)
    if (idx < 0) return reject('HTTP 404', 404)

    if (method === 'GET') return delay(contactsStore[idx] as unknown as T)
    if (method === 'PUT') return delay(updateContact(id, body as ContactUpdateRequest) as unknown as T)
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
    enrollmentId = installmentRef.enrollmentId
  }

  if (!enrollmentId) throw new Error('Debe especificarse installmentId o enrollmentId')

  const nowIso      = new Date().toISOString()
  const paymentDate = data.paymentDate ?? nowIso
  const created: Payment = {
    id:               crypto.randomUUID(),
    installmentId:    installmentRef?.id ?? null,
    enrollmentId,
    amount:           data.amount,
    paymentMethod:    data.paymentMethod,
    paymentDate,
    referenceNumber:  data.referenceNumber ?? null,
    receiptNumber:    nextReceipt(paymentDate.slice(0, 10)),
    receiptFilePath:  data.receiptFilePath ?? null,
    receiptSentAt:    null,
    notes:            data.notes ?? null,
    registeredBy:     null,
    createdAt:        nowIso,
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

// ─── Discount Campaigns ──────────────────────────────────────────────────────
function createDiscountCampaign(data: DiscountCampaignCreateRequest): DiscountCampaign {
  const now = new Date().toISOString()
  const created: DiscountCampaign = {
    id:           crypto.randomUUID(),
    name:         data.name,
    description:  data.description ?? null,
    discountType: data.discountType,
    value:        data.value,
    validFrom:    data.validFrom ?? null,
    validTo:      data.validTo   ?? null,
    active:       data.active ?? true,
    createdAt:    now,
    updatedAt:    now,
  }
  discountCampaignsStore = [created, ...discountCampaignsStore]
  return created
}

function updateDiscountCampaign(id: string, data: DiscountCampaignUpdateRequest): DiscountCampaign {
  const idx = discountCampaignsStore.findIndex(c => c.id === id)
  const current = discountCampaignsStore[idx]
  const updated: DiscountCampaign = {
    ...current,
    name:         data.name,
    description:  data.description ?? null,
    discountType: data.discountType,
    value:        data.value,
    validFrom:    data.validFrom ?? null,
    validTo:      data.validTo   ?? null,
    active:       data.active ?? current.active,
    updatedAt:    new Date().toISOString(),
  }
  discountCampaignsStore[idx] = updated
  return updated
}

// ─── Diplomas ────────────────────────────────────────────────────────────────
function createDiploma(data: DiplomaCreateRequest): Diploma {
  const now = new Date().toISOString()
  const created: Diploma = {
    id:                 crypto.randomUUID(),
    name:               data.name,
    universityName:     data.universityName    ?? null,
    description:        data.description       ?? null,
    enrollmentPrice:    data.enrollmentPrice   ?? null,
    coursePrice:        data.coursePrice       ?? null,
    taxCommissionPct:   data.taxCommissionPct  ?? null,
    secretarySalary:    data.secretarySalary   ?? null,
    advertisingAmount:  data.advertisingAmount ?? null,
    adminPct:           data.adminPct          ?? null,
    universityPct:      data.universityPct     ?? null,
    imedbaPct:          data.imedbaPct         ?? null,
    partnersConfig:     data.partnersConfig    ?? null,
    active:             true,
    createdAt:          now,
    updatedAt:          now,
  }
  diplomasStore = [created, ...diplomasStore]
  return created
}

// ─── Settlement engine (espejo del SettlementEngine.java backend) ─────────────
// Algoritmo: tax = total*tax%; netoTrasFijos = total - tax - secretarySalary - advertising
// adminAmount   = netoTrasFijos * adminPct/100
// universityAmt = netoTrasFijos * universityPct/100
// imedbaAmount  = netoTrasFijos * imedbaPct/100
// partner.amount= netoTrasFijos * partner.pct/100
function r2(n: number): number { return Math.round(n * 100) / 100 }

function computeSettlement(
  diplomaId: string,
  periodMonth: number,
  periodYear: number,
  totalCollected: number,
  id?: string,
  createdAt?: string,
): DiplomaSettlement {
  const dip = diplomasStore.find(d => d.id === diplomaId)
  if (!dip) throw new Error('Diplomatura inexistente')
  const taxPct       = dip.taxCommissionPct   ?? 0
  const secretary    = dip.secretarySalary    ?? 0
  const advertising  = dip.advertisingAmount  ?? 0
  const adminPct     = dip.adminPct           ?? 0
  const universityPct= dip.universityPct      ?? 0
  const imedbaPct    = dip.imedbaPct          ?? 0
  const partners     = dip.partnersConfig     ?? []

  const taxAmount       = r2(totalCollected * taxPct / 100)
  const netoTrasFijos   = r2(totalCollected - taxAmount - secretary - advertising)
  const adminAmount     = r2(netoTrasFijos * adminPct      / 100)
  const universityAmount= r2(netoTrasFijos * universityPct / 100)
  const imedbaAmount    = r2(netoTrasFijos * imedbaPct     / 100)
  const partnersDistribution = partners.map(p => ({
    name:   p.name,
    pct:    p.pct,
    amount: r2(netoTrasFijos * p.pct / 100),
    email:  p.email,
    paid:   false,
  }))
  const partnersTotal = r2(partnersDistribution.reduce((acc, p) => acc + p.amount, 0))

  const now = new Date().toISOString()
  return {
    id:                  id ?? crypto.randomUUID(),
    diplomaId,
    diplomaName:         dip.name,
    periodMonth,
    periodYear,
    totalCollected,
    taxCommissionAmount: taxAmount,
    secretaryAmount:     secretary,
    advertisingAmount:   advertising,
    adminAmount,
    universityAmount,
    imedbaAmount,
    partnersTotal,
    partnersDistribution,
    status:              'DRAFT',
    createdAt:           createdAt ?? now,
    updatedAt:           now,
  }
}

function createSettlement(data: DiplomaSettlementCreateRequest): DiplomaSettlement {
  const created = computeSettlement(data.diplomaId, data.periodMonth, data.periodYear, data.totalCollected)
  settlementsStore = [created, ...settlementsStore]
  return created
}

// ─── Budget ──────────────────────────────────────────────────────────────────
function createBudgetEntry(data: BudgetEntryCreateRequest): BudgetEntry {
  const now = new Date().toISOString()
  const [y, m] = data.entryDate.split('-').map(Number)
  const created: BudgetEntry = {
    id:               crypto.randomUUID(),
    entryType:        data.entryType,
    category:         data.category,
    subcategory:      data.subcategory     ?? null,
    businessUnit:     data.businessUnit    ?? null,
    concept:          data.concept,
    amount:           data.amount,
    entryDate:        data.entryDate,
    periodMonth:      m,
    periodYear:       y,
    paymentMethod:    data.paymentMethod   ?? null,
    recurring:        data.recurring       ?? null,
    cash:             data.cash            ?? null,
    projected:        data.projected       ?? false,
    referenceNumber:  data.referenceNumber ?? null,
    receiptFilePath:  data.receiptFilePath ?? null,
    contactId:        data.contactId       ?? null,
    enrollmentId:     data.enrollmentId    ?? null,
    paymentId:        null,
    bookSaleId:       null,
    notes:            data.notes ?? null,
    registeredBy:     null,
    createdAt:        now,
    updatedAt:        now,
  }
  budgetEntriesStore = [created, ...budgetEntriesStore]
  return created
}

function computeSummary(year: number, month: number): BudgetSummary {
  const inMonth = budgetEntriesStore.filter(
    e => e.periodYear === year && e.periodMonth === month,
  )
  let totalIncome = 0, totalExpense = 0, projectedIncome = 0, projectedExpense = 0
  for (const e of inMonth) {
    if (e.projected) {
      if (e.entryType === 'INCOME') projectedIncome  += e.amount
      else                          projectedExpense += e.amount
    } else {
      if (e.entryType === 'INCOME') totalIncome  += e.amount
      else                          totalExpense += e.amount
    }
  }
  return {
    year, month,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    projectedIncome,
    projectedExpense,
  }
}

function computeBreakdown(year: number, month: number): CategoryBreakdown[] {
  const inMonth = budgetEntriesStore.filter(
    e => e.periodYear === year && e.periodMonth === month && !e.projected,
  )
  // Group by (entryType, category, businessUnit)
  const map = new Map<string, CategoryBreakdown>()
  for (const e of inMonth) {
    const key = `${e.entryType}|${e.category}|${e.businessUnit ?? ''}`
    const cur = map.get(key)
    if (cur) cur.total += e.amount
    else map.set(key, {
      entryType:    e.entryType,
      category:     e.category,
      businessUnit: e.businessUnit,
      total:        e.amount,
    })
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

// ─── Contacts ────────────────────────────────────────────────────────────────
function createContact(data: ContactCreateRequest): Contact {
  const now = new Date().toISOString()
  const created: Contact = {
    id:               crypto.randomUUID(),
    contactType:      data.contactType,
    firstName:        data.firstName       ?? null,
    lastName:         data.lastName        ?? null,
    companyName:      data.companyName     ?? null,
    email:            data.email           ?? null,
    phone:            data.phone           ?? null,
    roleDescription:  data.roleDescription ?? null,
    keycloakUserId:   data.keycloakUserId  ?? null,
    active:           true,
    notes:            data.notes           ?? null,
    createdAt:        now,
    updatedAt:        now,
  }
  contactsStore = [created, ...contactsStore]
  return created
}

function updateContact(id: string, data: ContactUpdateRequest): Contact {
  const idx = contactsStore.findIndex(c => c.id === id)
  const current = contactsStore[idx]
  const updated: Contact = {
    ...current,
    contactType:      data.contactType,
    firstName:        data.firstName       ?? null,
    lastName:         data.lastName        ?? null,
    companyName:      data.companyName     ?? null,
    email:            data.email           ?? null,
    phone:            data.phone           ?? null,
    roleDescription:  data.roleDescription ?? null,
    keycloakUserId:   data.keycloakUserId  ?? null,
    notes:            data.notes           ?? null,
    updatedAt:        new Date().toISOString(),
  }
  contactsStore[idx] = updated
  return updated
}

function computeMonthlyFlow(year: number): MonthlyFlow[] {
  const result: MonthlyFlow[] = []
  for (let m = 1; m <= 12; m++) {
    const inMonth = budgetEntriesStore.filter(
      e => e.periodYear === year && e.periodMonth === m && !e.projected,
    )
    let income = 0, expense = 0
    for (const e of inMonth) {
      if (e.entryType === 'INCOME') income  += e.amount
      else                          expense += e.amount
    }
    result.push({ year, month: m, income, expense, balance: income - expense })
  }
  return result
}

function updateDiploma(id: string, data: DiplomaUpdateRequest): Diploma {
  const idx = diplomasStore.findIndex(d => d.id === id)
  const current = diplomasStore[idx]
  const updated: Diploma = {
    ...current,
    name:               data.name,
    universityName:     data.universityName    ?? null,
    description:        data.description       ?? null,
    enrollmentPrice:    data.enrollmentPrice   ?? null,
    coursePrice:        data.coursePrice       ?? null,
    taxCommissionPct:   data.taxCommissionPct  ?? null,
    secretarySalary:    data.secretarySalary   ?? null,
    advertisingAmount:  data.advertisingAmount ?? null,
    adminPct:           data.adminPct          ?? null,
    universityPct:      data.universityPct     ?? null,
    imedbaPct:          data.imedbaPct         ?? null,
    partnersConfig:     data.partnersConfig    ?? null,
    updatedAt:          new Date().toISOString(),
  }
  diplomasStore[idx] = updated
  return updated
}
