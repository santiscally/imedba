import type { Instant, UUID } from './common'

// Liquidación de comisiones de vendedora (doc 17 §3.1).
// Refleja com.imedba.modules.salescommission.dto.SalesCommissionDtos.

export type SalesCommissionStatus = 'DRAFT' | 'APPROVED' | 'PAID'

export const SALES_COMMISSION_STATUS_LABELS: Record<SalesCommissionStatus, string> = {
  DRAFT:    'Borrador',
  APPROVED: 'Aprobada',
  PAID:     'Pagada',
}

// Refleja CommissionSourceType. BOOK_SALE = libro suelto o colección: alícuota
// fija y NO consume posición en el ranking mensual.
export type CommissionSourceType = 'ENROLLMENT' | 'DIPLOMA_ENROLLMENT' | 'BOOK_SALE'

export const COMMISSION_SOURCE_LABELS: Record<CommissionSourceType, string> = {
  ENROLLMENT:         'Curso',
  DIPLOMA_ENROLLMENT: 'Diplomatura',
  BOOK_SALE:          'Libro',
}

/** Vendedor con ventas en el período. `name` puede ser null si Keycloak admin está apagado. */
export interface CommissionSeller {
  id:   UUID
  name: string | null
}

export interface SalesCommissionLine {
  id:                UUID | null   // null en el preview (no se persiste)
  sourceType:        CommissionSourceType
  sourceId:          UUID
  studentName:       string | null
  productName:       string | null
  saleDate:          string        // ISO yyyy-MM-dd
  saleMonthRank:     number | null // null para libros: no rankean
  rateApplied:       number        // 0.005 = 0,5%
  collectedAmount:   number        // cobrado DENTRO del período
  commissionAmount:  number
  fromPriorPeriod:   boolean       // venta de un mes anterior que cobró en este
}

export interface SalesCommission {
  id:            UUID | null   // null en el preview
  sellerUserId:  UUID
  sellerName:    string | null
  periodMonth:   number        // 1–12
  periodYear:    number

  // Parámetros congelados al liquidar
  tier1Rate:     number
  tier2Rate:     number
  booksRate:     number
  tierThreshold: number

  // Buckets — espejo de las filas de la planilla que IMEDBA lleva a mano
  tier1Base:              number
  tier1Commission:        number
  tier2Base:              number
  tier2Commission:        number
  booksBase:              number
  booksCommission:        number
  priorMonthsBase:        number
  priorMonthsCommission:  number

  /**
   * OJO: NO es la suma de los 4 buckets redondeados. El backend suma sin redondear
   * y redondea una sola vez. Sumar los buckets da 1 centavo de más y deja de
   * coincidir con la planilla de Nico — mostrar este campo tal cual.
   */
  totalCommission: number

  status:    SalesCommissionStatus
  notes:     string | null
  lines:     SalesCommissionLine[]
  createdAt: Instant | null
  updatedAt: Instant | null
}

export interface SalesCommissionSummary {
  id:              UUID
  sellerUserId:    UUID
  sellerName:      string | null
  periodMonth:     number
  periodYear:      number
  totalCommission: number
  status:          SalesCommissionStatus
  createdAt:       Instant
}

export interface SalesCommissionCreateRequest {
  sellerUserId:   UUID
  sellerName?:    string | null
  periodMonth:    number
  periodYear:     number
  tier1Rate?:     number | null
  tier2Rate?:     number | null
  booksRate?:     number | null
  tierThreshold?: number | null
  notes?:         string | null
}

/** 0.005 → "0,5%" */
export function formatRate(rate: number): string {
  const pct = rate * 100
  return `${pct.toLocaleString('es-AR', { maximumFractionDigits: 3 })}%`
}
