import type { BookSale } from '../../types/book-sale'

// Ventas de libros (append-only). unitPrice ya refleja el descuento de alumno
// cuando studentSale=true. totalAmount = unitPrice * quantity.

interface Seed {
  book:     string
  bookName: string
  qty:      number
  unit:     number
  student:  boolean
  date:     string   // YYYY-MM-DD
}

const B = '88888888-8888-8888-8888-0000000000'

const SEED: Seed[] = [
  { book: `${B}01`, bookName: 'Manual de Cardiología Pediátrica', qty: 2, unit: 45_000, student: false, date: '2026-03-05' },
  { book: `${B}01`, bookName: 'Manual de Cardiología Pediátrica', qty: 1, unit: 31_500, student: true,  date: '2026-03-12' },
  { book: `${B}03`, bookName: 'Semiología Médica Aplicada',        qty: 1, unit: 26_600, student: true,  date: '2026-03-20' },
  { book: `${B}04`, bookName: 'Guía de Reválida 2026',             qty: 1, unit: 30_000, student: false, date: '2026-04-02' },
  { book: `${B}05`, bookName: 'Prematuros: Cuidados Intensivos',   qty: 3, unit: 28_000, student: false, date: '2026-04-10' },
  { book: `${B}03`, bookName: 'Semiología Médica Aplicada',        qty: 2, unit: 38_000, student: false, date: '2026-04-18' },
  { book: `${B}01`, bookName: 'Manual de Cardiología Pediátrica', qty: 1, unit: 31_500, student: true,  date: '2026-04-25' },
]

let idCounter = 1
function nextId(): string {
  return `99999999-9999-9999-9999-${(idCounter++).toString().padStart(12, '0')}`
}

export const MOCK_BOOK_SALES: BookSale[] = SEED.map((s, i) => ({
  id:           nextId(),
  bookId:       s.book,
  bookName:     s.bookName,
  studentId:    s.student ? `11111111-1111-1111-1111-${(i + 1).toString().padStart(12, '0')}` : null,
  enrollmentId: null,
  quantity:     s.qty,
  unitPrice:    s.unit,
  studentSale:  s.student,
  totalAmount:  s.unit * s.qty,
  saleDate:     `${s.date}T13:00:00Z`,
  soldBy:       null,
  notes:        null,
  createdAt:    `${s.date}T13:00:00Z`,
}))
