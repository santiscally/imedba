import type { Instant, UUID } from './common'

// Refleja com.imedba.modules.author.dto.AuthorResponse
export interface Author {
  id:        UUID
  firstName: string
  lastName:  string
  email:     string | null
  phone:     string | null
  active:    boolean
  createdAt: Instant
  updatedAt: Instant
}

// Refleja AuthorCreateRequest (firstName/lastName @NotBlank max 100; email @Email max 255; phone max 50)
export interface AuthorCreateRequest {
  firstName: string
  lastName:  string
  email?:    string | null
  phone?:    string | null
}

// Refleja AuthorUpdateRequest
export interface AuthorUpdateRequest {
  firstName?: string
  lastName?:  string
  email?:     string | null
  phone?:     string | null
  active?:    boolean
}
