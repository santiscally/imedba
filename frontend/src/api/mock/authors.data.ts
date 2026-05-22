import type { Author } from '../../types/author'

const now     = '2026-04-20T14:30:00Z'
const created = '2025-10-01T10:00:00Z'

export const MOCK_AUTHORS: Author[] = [
  {
    id: '77777777-7777-7777-7777-000000000001',
    firstName: 'María', lastName: 'González',
    email: 'maria.gonzalez@imedba.dev', phone: '+54 11 4555-1001',
    active: true, createdAt: created, updatedAt: now,
  },
  {
    id: '77777777-7777-7777-7777-000000000002',
    firstName: 'Carlos', lastName: 'Pereyra',
    email: 'carlos.pereyra@imedba.dev', phone: '+54 351 555-2002',
    active: true, createdAt: created, updatedAt: now,
  },
  {
    id: '77777777-7777-7777-7777-000000000003',
    firstName: 'Laura', lastName: 'Fernández',
    email: 'laura.fernandez@imedba.dev', phone: null,
    active: true, createdAt: created, updatedAt: now,
  },
  {
    id: '77777777-7777-7777-7777-000000000004',
    firstName: 'Roberto', lastName: 'Díaz',
    email: 'roberto.diaz@imedba.dev', phone: '+54 11 4555-4004',
    active: true, createdAt: created, updatedAt: now,
  },
  {
    id: '77777777-7777-7777-7777-000000000005',
    firstName: 'Ana', lastName: 'Suárez',
    email: null, phone: null,
    active: false, createdAt: '2025-09-01T10:00:00Z', updatedAt: '2026-01-15T09:00:00Z',
  },
]
