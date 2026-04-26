import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.contact.entity.ContactType
export type ContactType = 'EMPLEADO' | 'PROVEEDOR'

export const CONTACT_TYPES: ContactType[] = ['EMPLEADO', 'PROVEEDOR']

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  EMPLEADO:  'Empleado',
  PROVEEDOR: 'Proveedor',
}

// Refleja com.imedba.modules.contact.dto.ContactResponse
export interface Contact {
  id:               UUID
  contactType:      ContactType
  firstName:        string | null
  lastName:         string | null
  companyName:      string | null
  email:            string | null
  phone:            string | null
  roleDescription:  string | null
  keycloakUserId:   UUID | null
  active:           boolean | null
  notes:            string | null
  createdAt:        Instant
  updatedAt:        Instant
}

// Refleja com.imedba.modules.contact.dto.ContactCreateRequest
// Validación cruzada (replicada client-side):
//  - EMPLEADO  → firstName + lastName obligatorios
//  - PROVEEDOR → companyName obligatorio
export interface ContactCreateRequest {
  contactType:      ContactType
  firstName?:       string | null            // max 100
  lastName?:        string | null            // max 100
  companyName?:     string | null            // max 200
  email?:           string | null            // max 255, formato email
  phone?:           string | null            // max 50
  roleDescription?: string | null            // max 200
  keycloakUserId?:  UUID | null
  notes?:           string | null
}

// Update idéntico a Create
export type ContactUpdateRequest = ContactCreateRequest
