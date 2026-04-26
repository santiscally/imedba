import type { DiplomaSettlement } from '../../types/diploma-settlement'

// Liquidaciones mock para algunas diplomaturas. Calculadas con porcentajes del
// MOCK_DIPLOMAS para coherencia visual.
//
// Hoy de referencia: 2026-04-25.

const now     = '2026-04-15T14:00:00Z'
const created = '2026-02-05T10:00:00Z'

// Diploma "Cardiología Pediátrica" (id ...000000000001):
//   taxCommission=15%, secretarySalary=180.000, advertising=90.000,
//   admin=10%, university=30%, imedba=15%,
//   socias: Méndez 25%, Soriano 20%
//
// Liquidación enero 2026 — totalCollected = 5.500.000
//   tax    = 5.500.000 * 0.15 = 825.000
//   netoTrasFijos = 5.500.000 - 825.000 - 180.000 - 90.000 = 4.405.000
//   admin  = 4.405.000 * 0.10 = 440.500
//   univ   = 4.405.000 * 0.30 = 1.321.500
//   imedba = 4.405.000 * 0.15 = 660.750
//   méndez = 4.405.000 * 0.25 = 1.101.250
//   soriano= 4.405.000 * 0.20 =   881.000
//   partnersTotal = 1.982.250

export const MOCK_DIPLOMA_SETTLEMENTS: DiplomaSettlement[] = [
  {
    id:                  '88888888-8888-8888-8888-000000000001',
    diplomaId:           '77777777-7777-7777-7777-000000000001',
    diplomaName:         'Diplomatura en Cardiología Pediátrica',
    periodMonth:         1,
    periodYear:          2026,
    totalCollected:      5_500_000,
    taxCommissionAmount: 825_000,
    secretaryAmount:     180_000,
    advertisingAmount:   90_000,
    adminAmount:         440_500,
    universityAmount:    1_321_500,
    imedbaAmount:        660_750,
    partnersTotal:       1_982_250,
    partnersDistribution: [
      { name: 'Dra. Laura Méndez',     pct: 25, amount: 1_101_250, email: 'laura.mendez@imedba.dev',     paid: true },
      { name: 'Dra. Patricia Soriano', pct: 20, amount:   881_000, email: 'patricia.soriano@imedba.dev', paid: true },
    ],
    status:              'PAID',
    createdAt:           created,
    updatedAt:           '2026-02-25T11:00:00Z',
  },
  {
    id:                  '88888888-8888-8888-8888-000000000002',
    diplomaId:           '77777777-7777-7777-7777-000000000001',
    diplomaName:         'Diplomatura en Cardiología Pediátrica',
    periodMonth:         2,
    periodYear:          2026,
    totalCollected:      4_800_000,
    taxCommissionAmount: 720_000,
    secretaryAmount:     180_000,
    advertisingAmount:   90_000,
    adminAmount:         381_000,
    universityAmount:    1_143_000,
    imedbaAmount:        571_500,
    partnersTotal:       1_714_500,
    partnersDistribution: [
      { name: 'Dra. Laura Méndez',     pct: 25, amount:   952_500, email: 'laura.mendez@imedba.dev',     paid: true },
      { name: 'Dra. Patricia Soriano', pct: 20, amount:   762_000, email: 'patricia.soriano@imedba.dev', paid: false },
    ],
    status:              'APPROVED',
    createdAt:           '2026-03-05T10:00:00Z',
    updatedAt:           '2026-03-20T11:00:00Z',
  },
  {
    id:                  '88888888-8888-8888-8888-000000000003',
    diplomaId:           '77777777-7777-7777-7777-000000000001',
    diplomaName:         'Diplomatura en Cardiología Pediátrica',
    periodMonth:         3,
    periodYear:          2026,
    totalCollected:      5_100_000,
    taxCommissionAmount: 765_000,
    secretaryAmount:     180_000,
    advertisingAmount:   90_000,
    adminAmount:         406_500,
    universityAmount:    1_219_500,
    imedbaAmount:        609_750,
    partnersTotal:       1_829_250,
    partnersDistribution: [
      { name: 'Dra. Laura Méndez',     pct: 25, amount: 1_016_250, email: 'laura.mendez@imedba.dev',     paid: false },
      { name: 'Dra. Patricia Soriano', pct: 20, amount:   813_000, email: 'patricia.soriano@imedba.dev', paid: false },
    ],
    status:              'DRAFT',
    createdAt:           '2026-04-05T10:00:00Z',
    updatedAt:           now,
  },
  // Liquidación de "Neonatología Avanzada" (...000000000002):
  //   tax=12%, secretary=150.000, advertising=60.000, admin=10%, univ=35%, imedba=18%
  //   socias: Méndez 15%, Soriano 10%
  //   totalCollected = 4.200.000 → tax=504.000 → neto=3.486.000
  //   admin=348.600, univ=1.220.100, imedba=627.480
  //   méndez=522.900, soriano=348.600 → partnersTotal=871.500
  {
    id:                  '88888888-8888-8888-8888-000000000004',
    diplomaId:           '77777777-7777-7777-7777-000000000002',
    diplomaName:         'Diplomatura en Neonatología Avanzada',
    periodMonth:         3,
    periodYear:          2026,
    totalCollected:      4_200_000,
    taxCommissionAmount: 504_000,
    secretaryAmount:     150_000,
    advertisingAmount:   60_000,
    adminAmount:         348_600,
    universityAmount:    1_220_100,
    imedbaAmount:        627_480,
    partnersTotal:       871_500,
    partnersDistribution: [
      { name: 'Dra. Laura Méndez',     pct: 15, amount: 522_900, email: 'laura.mendez@imedba.dev',     paid: false },
      { name: 'Dra. Patricia Soriano', pct: 10, amount: 348_600, email: 'patricia.soriano@imedba.dev', paid: false },
    ],
    status:              'APPROVED',
    createdAt:           '2026-04-08T10:00:00Z',
    updatedAt:           now,
  },
]
