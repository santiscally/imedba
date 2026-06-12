import type { Instant } from '../types/common'
import { apiGet } from './client'

// Refleja com.imedba.modules.dashboard.dto.DashboardSummaryResponse
export interface DashboardSummary {
  alumnosActivos: number
  cursosActivos:  number
  cuotasVencidas: number
  ingresosMes:    number
}

// Refleja com.imedba.modules.dashboard.dto.ActivityItemResponse
// type: 'payment' | 'enrollment' | 'sale'.
export interface ActivityItem {
  id:     string
  type:   string
  title:  string
  detail: string
  amount: number | null
  date:   Instant
}

export const dashboardApi = {
  summary(): Promise<DashboardSummary> {
    return apiGet<DashboardSummary>('/dashboard/summary')
  },
  activity(): Promise<ActivityItem[]> {
    return apiGet<ActivityItem[]>('/dashboard/activity')
  },
}
