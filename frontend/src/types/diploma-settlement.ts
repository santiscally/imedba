import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.diplomasettlement.entity.SettlementStatus
export type SettlementStatus = 'DRAFT' | 'APPROVED' | 'PAID'

export const SETTLEMENT_STATUSES: SettlementStatus[] = ['DRAFT', 'APPROVED', 'PAID']

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  DRAFT:    'Borrador',
  APPROVED: 'Aprobada',
  PAID:     'Pagada',
}

/** Refleja DirectorDistributionDto. Sin porcentaje: reparten en partes iguales. */
export interface DirectorDistribution {
  staffId: UUID | null
  name:    string
  email:   string | null
  amount:  number
  paid:    boolean | null
}

/**
 * Liquidación de diplomatura (PREMA) — fórmula V035, doc 17 §3.3.
 *
 * Los campos vienen en el ORDEN de la fórmula, para poder mostrarla igual que la
 * planilla de IMEDBA:
 *
 *   cobrado − impuestos = subtotal 1                          («verde»)
 *   subtotal 1 − secretaria − publicidad
 *              − administración − gastos varios = subtotal 2  («naranja»)
 *   mitad = subtotal 2 / 2
 *     directoras = (mitad − grabaciones) en partes iguales
 *     IMEDBA = mitad × 80%   ·   UNTREF = mitad × 20%
 *
 * Identidad de control: subtotal2 = Σ directoras + grabaciones + IMEDBA + UNTREF.
 */
export interface DiplomaSettlement {
  id:          UUID
  diplomaId:   UUID
  diplomaName: string
  periodMonth: number   // 1–12
  periodYear:  number

  // Inputs cargados al liquidar (no viven en la diplomatura)
  inputTaxCommissionPct:     number | null   // impuestos y gastos bancarios, %
  inputSecretarySalary:      number | null
  inputAdvertisingAmount:    number | null
  inputAdministrationAmount: number | null   // MONTO FIJO (antes era un %)
  inputMiscExpensesAmount:   number | null   // GASTOS VARIOS
  inputRecordingsAmount:     number | null   // grabaciones docentes
  inputImedbaPct:            number | null   // default 80
  inputUntrefPct:            number | null   // default 20

  // Cálculo, paso por paso
  totalCollected:        number
  taxCommissionAmount:   number
  subtotal1:             number
  secretaryAmount:       number
  advertisingAmount:     number
  administrationAmount:  number
  miscExpensesAmount:    number
  subtotal2:             number
  halfAmount:            number
  recordingsAmount:      number   // se descuenta SÓLO de la mitad de las directoras
  directorsBaseAmount:   number   // mitad − grabaciones
  directorsDistribution: DirectorDistribution[]
  imedbaAmount:          number
  untrefAmount:          number   // se acumula, no se paga mensualmente

  status:    SettlementStatus
  createdAt: Instant
  updatedAt: Instant
}

// Refleja DiplomaSettlementCreateRequest.
// Los 4 gastos administrativos son MONTOS FIJOS, no porcentajes.
export interface DiplomaSettlementCreateRequest {
  diplomaId:   UUID
  periodMonth: number   // 1–12
  periodYear:  number
  /** null = el backend suma los pagos del período del curso vinculado (V026). */
  totalCollected?: number | null

  taxPct?:               number | null   // 0–100, PRIMER descuento
  secretaryAmount?:      number | null
  advertisingAmount?:    number | null
  administrationAmount?: number | null
  miscExpensesAmount?:   number | null
  recordingsAmount?:     number | null
  imedbaPct?:            number | null   // default 80
  untrefPct?:            number | null   // default 20
}
