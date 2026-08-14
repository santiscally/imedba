import type {
  ActivityType, ActivityTypeCreateRequest, ActivityTypeUpdateRequest,
} from '../types/activity-type'
import { apiGet, apiPost, apiPut } from './client'

// Valores hora — refleja ActivityTypeController (/api/v1/activity-types).
// Authorities: staff:read / staff:write.

export const activityTypesApi = {
  list(onlyActive?: boolean): Promise<ActivityType[]> {
    const q = onlyActive ? '?onlyActive=true' : ''
    return apiGet<ActivityType[]>(`/activity-types${q}`)
  },
  create(body: ActivityTypeCreateRequest): Promise<ActivityType> {
    return apiPost<ActivityType, ActivityTypeCreateRequest>('/activity-types', body)
  },
  update(id: string, body: ActivityTypeUpdateRequest): Promise<ActivityType> {
    return apiPut<ActivityType, ActivityTypeUpdateRequest>(`/activity-types/${id}`, body)
  },
}
