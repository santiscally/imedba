import type { Book } from '../../types/book'

const now     = '2026-04-20T14:30:00Z'
const created = '2025-11-01T10:00:00Z'

const A = '77777777-7777-7777-7777-0000000000'

export const MOCK_BOOKS: Book[] = [
  {
    id: '88888888-8888-8888-8888-000000000001',
    name: 'Manual de Cardiología Pediátrica', code: 'LIB-CARD-PED',
    specialty: 'Cardiología', format: 'Impreso', edition: '3ra', pages: 540,
    salePrice: 45_000, studentDiscountPct: 30, costPerUnit: 18_000,
    stockQuantity: 40, branch: 'Residencias', active: true,
    authors: [
      { authorId: `${A}01`, firstName: 'María',  lastName: 'González', royaltyPercentage: 60 },
      { authorId: `${A}02`, firstName: 'Carlos', lastName: 'Pereyra',  royaltyPercentage: 40 },
    ],
    createdAt: created, updatedAt: now,
  },
  {
    id: '88888888-8888-8888-8888-000000000002',
    name: 'Atlas de Neonatología', code: 'LIB-NEO-ATLAS',
    specialty: 'Neonatología', format: 'Impreso', edition: '2da', pages: 320,
    salePrice: 52_000, studentDiscountPct: 30, costPerUnit: 20_000,
    stockQuantity: 0, branch: 'Formación Superior', active: true,
    authors: [
      { authorId: `${A}03`, firstName: 'Laura', lastName: 'Fernández', royaltyPercentage: 100 },
    ],
    createdAt: created, updatedAt: now,
  },
  {
    id: '88888888-8888-8888-8888-000000000003',
    name: 'Semiología Médica Aplicada', code: 'LIB-SEMIO',
    specialty: 'Clínica Médica', format: 'Impreso', edition: '1ra', pages: 680,
    salePrice: 38_000, studentDiscountPct: 30, costPerUnit: 15_000,
    stockQuantity: 120, branch: 'Residencias', active: true,
    authors: [
      { authorId: `${A}04`, firstName: 'Roberto', lastName: 'Díaz',     royaltyPercentage: 50 },
      { authorId: `${A}01`, firstName: 'María',   lastName: 'González', royaltyPercentage: 50 },
    ],
    createdAt: created, updatedAt: now,
  },
  {
    id: '88888888-8888-8888-8888-000000000004',
    name: 'Guía de Reválida 2026', code: 'LIB-REVAL',
    specialty: 'General', format: 'Digital', edition: '2026', pages: 210,
    salePrice: 30_000, studentDiscountPct: 20, costPerUnit: 4_000,
    stockQuantity: 15, branch: 'Residencias', active: true,
    authors: [
      { authorId: `${A}02`, firstName: 'Carlos', lastName: 'Pereyra', royaltyPercentage: 100 },
    ],
    createdAt: created, updatedAt: now,
  },
  {
    id: '88888888-8888-8888-8888-000000000005',
    name: 'Prematuros: Cuidados Intensivos', code: 'LIB-PREMA',
    specialty: 'Neonatología', format: 'Impreso', edition: '1ra', pages: 410,
    salePrice: 28_000, studentDiscountPct: 30, costPerUnit: 11_000,
    stockQuantity: 60, branch: 'Formación Superior', active: true,
    authors: [
      { authorId: `${A}03`, firstName: 'Laura', lastName: 'Fernández', royaltyPercentage: 70 },
      { authorId: `${A}05`, firstName: 'Ana',   lastName: 'Suárez',    royaltyPercentage: 30 },
    ],
    createdAt: created, updatedAt: now,
  },
  {
    id: '88888888-8888-8888-8888-000000000006',
    name: 'Farmacología Clínica (descatalogado)', code: 'LIB-FARMA',
    specialty: 'Farmacología', format: 'Impreso', edition: '1ra', pages: 500,
    salePrice: 41_000, studentDiscountPct: 30, costPerUnit: 16_000,
    stockQuantity: 5, branch: 'Residencias', active: false,
    authors: [
      { authorId: `${A}04`, firstName: 'Roberto', lastName: 'Díaz', royaltyPercentage: 100 },
    ],
    createdAt: '2025-06-01T10:00:00Z', updatedAt: '2026-02-01T09:00:00Z',
  },
]
