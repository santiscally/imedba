import type { Diploma } from '../../types/diploma'

// Dataset mock de diplomaturas. Pocas pero con configuración completa de
// reparto: comisiones, salarios, publicidad y socias con %.
// Hoy de referencia: 2026-04-25.

const now     = '2026-04-20T14:30:00Z'
const created = '2025-09-15T10:00:00Z'

export const MOCK_DIPLOMAS: Diploma[] = [
  {
    id:                 '77777777-7777-7777-7777-000000000001',
    name:               'Diplomatura en Cardiología Pediátrica',
    universityName:     'Universidad Nacional de Rosario',
    description:        'Programa de 18 meses con módulos teórico-prácticos y trabajo final integrador.',
    enrollmentPrice:    250_000,
    coursePrice:        2_400_000,
    taxCommissionPct:   15,
    secretarySalary:    180_000,
    advertisingAmount:  90_000,
    adminPct:           10,
    universityPct:      30,
    imedbaPct:          15,
    partnersConfig: [
      { name: 'Dra. Laura Méndez',    pct: 25, email: 'laura.mendez@imedba.dev' },
      { name: 'Dra. Patricia Soriano', pct: 20, email: 'patricia.soriano@imedba.dev' },
    ],
    active:    true,
    createdAt: created,
    updatedAt: now,
  },
  {
    id:                 '77777777-7777-7777-7777-000000000002',
    name:               'Diplomatura en Neonatología Avanzada',
    universityName:     'Universidad Católica de Córdoba',
    description:        'Diplomatura intensiva de 12 meses orientada a neonatólogos en formación o con experiencia.',
    enrollmentPrice:    220_000,
    coursePrice:        1_980_000,
    taxCommissionPct:   12,
    secretarySalary:    150_000,
    advertisingAmount:  60_000,
    adminPct:           10,
    universityPct:      35,
    imedbaPct:          18,
    partnersConfig: [
      { name: 'Dra. Laura Méndez',     pct: 15, email: 'laura.mendez@imedba.dev' },
      { name: 'Dra. Patricia Soriano',  pct: 10, email: 'patricia.soriano@imedba.dev' },
    ],
    active:    true,
    createdAt: '2025-10-20T10:00:00Z',
    updatedAt: now,
  },
  {
    id:                 '77777777-7777-7777-7777-000000000003',
    name:               'Diplomatura en Medicina Crítica',
    universityName:     'Universidad de Buenos Aires',
    description:        null,
    enrollmentPrice:    280_000,
    coursePrice:        2_650_000,
    taxCommissionPct:   15,
    secretarySalary:    180_000,
    advertisingAmount:  100_000,
    adminPct:           12,
    universityPct:      28,
    imedbaPct:          20,
    partnersConfig: [
      { name: 'Dra. Laura Méndez',    pct: 15, email: null },
      { name: 'Dra. Patricia Soriano', pct: 10, email: null },
    ],
    active:    true,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: now,
  },
  {
    id:                 '77777777-7777-7777-7777-000000000004',
    name:               'Diplomatura en Endocrinología (edición 2024)',
    universityName:     'Universidad Nacional del Sur',
    description:        'Edición discontinuada — quedan inscriptos a liquidar de cohortes anteriores.',
    enrollmentPrice:    180_000,
    coursePrice:        1_500_000,
    taxCommissionPct:   12,
    secretarySalary:    120_000,
    advertisingAmount:  50_000,
    adminPct:           10,
    universityPct:      30,
    imedbaPct:          15,
    partnersConfig: [
      { name: 'Dra. Laura Méndez',    pct: 18, email: 'laura.mendez@imedba.dev' },
      { name: 'Dra. Patricia Soriano', pct: 15, email: 'patricia.soriano@imedba.dev' },
    ],
    active:    false,
    createdAt: '2024-08-01T10:00:00Z',
    updatedAt: '2025-12-15T10:00:00Z',
  },
]
