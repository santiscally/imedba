import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type {
  AppUser, CreateUserRequest, UpdateUserRequest, ResetPasswordRequest,
} from '../types/user'

// Módulo Personal — refleja UserAdminController (/api/v1/users). Solo admin (admin:manage).
// Los usuarios viven en Keycloak; el backend habla con el Admin REST API.

export const usersApi = {
  list(): Promise<AppUser[]> {
    return apiGet<AppUser[]>('/users')
  },
  roles(): Promise<string[]> {
    return apiGet<string[]>('/users/roles')
  },
  create(body: CreateUserRequest): Promise<AppUser> {
    return apiPost<AppUser, CreateUserRequest>('/users', body)
  },
  update(id: string, body: UpdateUserRequest): Promise<void> {
    return apiPut<void, UpdateUserRequest>(`/users/${id}`, body)
  },
  resetPassword(id: string, body: ResetPasswordRequest): Promise<void> {
    return apiPut<void, ResetPasswordRequest>(`/users/${id}/reset-password`, body)
  },
  remove(id: string): Promise<void> {
    return apiDelete(`/users/${id}`)
  },
}
