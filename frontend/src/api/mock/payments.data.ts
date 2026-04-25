import type { Payment } from '../../types/payment'
import { MOCK_INSTALLMENTS } from './installments.data'

// Dataset mock de pagos — uno por cada cuota PAID en MOCK_INSTALLMENTS, más
// algunos pagos de matrícula iniciales (sin installmentId).

let receiptCounter = 1
function receipt(date: string): string {
  const compact = date.replace(/-/g, '')
  const seq = (receiptCounter++).toString().padStart(6, '0')
  return `IMD-${compact}-${seq}`
}

let idCounter = 1
function nextId(): string {
  return `55555555-5555-5555-5555-${(idCounter++).toString().padStart(12, '0')}`
}

// 1) Pagos derivados de cuotas pagadas
const fromInstallments: Payment[] = MOCK_INSTALLMENTS
  .filter(i => i.status === 'PAID' && i.paidAt)
  .map(i => {
    const paymentDate = i.paidAt!.slice(0, 10)
    return {
      id: nextId(),
      enrollment: {
        id:               i.enrollment.id,
        studentId:        i.enrollment.studentId,
        studentFirstName: i.enrollment.studentFirstName,
        studentLastName:  i.enrollment.studentLastName,
        courseId:         i.enrollment.courseId,
        courseName:       i.enrollment.courseName,
      },
      installmentId:     i.id,
      installmentNumber: i.number,
      receiptNumber:     receipt(paymentDate),
      paymentMethod:     'TRANSFERENCIA',
      amount:            i.totalDue,
      paymentDate,
      notes:             null,
      createdAt:         i.paidAt!,
    } satisfies Payment
  })

// 2) Pagos sueltos: matrículas pagadas al inscribirse (sin installmentId).
const enrollmentFeePayments: Payment[] = [
  {
    enrId: '33333333-3333-3333-3333-000000000001',
    studentId: '11111111-1111-1111-1111-000000000001',
    firstName: 'María Sol', lastName: 'Álvarez',
    courseId: '22222222-2222-2222-2222-000000000002',
    courseName: 'Curso Intensivo Vivo 2026',
    amount: 120_000, date: '2025-11-05', method: 'TRANSFERENCIA' as const,
  },
  {
    enrId: '33333333-3333-3333-3333-000000000003',
    studentId: '11111111-1111-1111-1111-000000000003',
    firstName: 'Camila', lastName: 'Céspedes',
    courseId: '22222222-2222-2222-2222-000000000002',
    courseName: 'Curso Intensivo Vivo 2026',
    amount: 120_000, date: '2025-11-10', method: 'MERCADO_PAGO' as const,
  },
  {
    enrId: '33333333-3333-3333-3333-000000000004',
    studentId: '11111111-1111-1111-1111-000000000004',
    firstName: 'Federico', lastName: "D'Amico",
    courseId: '22222222-2222-2222-2222-000000000005',
    courseName: 'Curso Sólo Choice Córdoba 2026',
    amount: 100_000, date: '2025-11-12', method: 'TARJETA_CREDITO' as const,
  },
  {
    enrId: '33333333-3333-3333-3333-000000000007',
    studentId: '11111111-1111-1111-1111-000000000007',
    firstName: 'Agustina', lastName: 'González',
    courseId: '22222222-2222-2222-2222-000000000009',
    courseName: 'Curso Sólo Choice Plus Libre',
    amount: 150_000, date: '2025-12-02', method: 'TRANSFERENCIA' as const,
  },
].map(p => ({
  id: nextId(),
  enrollment: {
    id: p.enrId, studentId: p.studentId,
    studentFirstName: p.firstName, studentLastName: p.lastName,
    courseId: p.courseId, courseName: p.courseName,
  },
  installmentId:     null,
  installmentNumber: null,
  receiptNumber:     receipt(p.date),
  paymentMethod:     p.method,
  amount:            p.amount,
  paymentDate:       p.date,
  notes:             'Matrícula',
  createdAt:         `${p.date}T11:00:00Z`,
} satisfies Payment))

export const MOCK_PAYMENTS: Payment[] = [
  ...enrollmentFeePayments,
  ...fromInstallments,
]
