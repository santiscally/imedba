import type { Payment } from '../../types/payment'
import { MOCK_INSTALLMENTS } from './installments.data'

// Dataset mock de pagos (forma PLANA: installmentId + enrollmentId).
// Uno por cada cuota PAID + algunos pagos de matrícula sueltos (sin installmentId).

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
    const paymentDate = i.paidAt!   // Instant
    return {
      id:               nextId(),
      installmentId:    i.id,
      enrollmentId:     i.enrollmentId,
      amount:           i.totalDue,
      paymentMethod:    'TRANSFERENCIA' as const,
      paymentDate,
      referenceNumber:  null,
      receiptNumber:    receipt(paymentDate.slice(0, 10)),
      receiptFilePath:  null,
      receiptSentAt:    null,
      notes:            null,
      registeredBy:     null,
      createdAt:        paymentDate,
    } satisfies Payment
  })

// 2) Pagos sueltos: matrículas pagadas al inscribirse (sin installmentId).
const enrollmentFeePayments: Payment[] = [
  { enrollmentId: '33333333-3333-3333-3333-000000000001', amount: 120_000, date: '2025-11-05', method: 'TRANSFERENCIA' as const },
  { enrollmentId: '33333333-3333-3333-3333-000000000003', amount: 120_000, date: '2025-11-10', method: 'MERCADO_PAGO' as const },
  { enrollmentId: '33333333-3333-3333-3333-000000000004', amount: 100_000, date: '2025-11-12', method: 'TARJETA_CREDITO' as const },
  { enrollmentId: '33333333-3333-3333-3333-000000000007', amount: 150_000, date: '2025-12-02', method: 'TRANSFERENCIA' as const },
].map(p => ({
  id:               nextId(),
  installmentId:    null,
  enrollmentId:     p.enrollmentId,
  amount:           p.amount,
  paymentMethod:    p.method,
  paymentDate:      `${p.date}T11:00:00Z`,
  referenceNumber:  null,
  receiptNumber:    receipt(p.date),
  receiptFilePath:  null,
  receiptSentAt:    null,
  notes:            'Matrícula',
  registeredBy:     null,
  createdAt:        `${p.date}T11:00:00Z`,
} satisfies Payment))

export const MOCK_PAYMENTS: Payment[] = [
  ...enrollmentFeePayments,
  ...fromInstallments,
]
