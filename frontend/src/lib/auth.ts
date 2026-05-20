// OIDC Authorization Code + PKCE flow contra Keycloak realm `imedba`,
// client público `imedba-frontend`. No usa librerías externas para evitar
// inflar el bundle. Tokens en localStorage; refresh automático ante expiración.

const KC_URL      = import.meta.env.VITE_KEYCLOAK_URL      ?? 'http://localhost:8081'
const KC_REALM    = import.meta.env.VITE_KEYCLOAK_REALM    ?? 'imedba'
const KC_CLIENT   = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'imedba-frontend'
const REDIRECT    = `${window.location.origin}/auth/callback`

const ISSUER         = `${KC_URL}/realms/${KC_REALM}`
const AUTH_ENDPOINT  = `${ISSUER}/protocol/openid-connect/auth`
const TOKEN_ENDPOINT = `${ISSUER}/protocol/openid-connect/token`
const LOGOUT_ENDPOINT = `${ISSUER}/protocol/openid-connect/logout`

const STORAGE = {
  ACCESS:      'imedba.auth.access_token',
  REFRESH:     'imedba.auth.refresh_token',
  ID:          'imedba.auth.id_token',
  EXPIRES_AT:  'imedba.auth.expires_at',
  PKCE_VERIFIER: 'imedba.auth.pkce_verifier',
  RETURN_PATH: 'imedba.auth.return_path',
} as const

interface TokenResponse {
  access_token:  string
  refresh_token: string
  id_token:      string
  expires_in:    number
  token_type:    string
}

interface JwtPayload {
  sub:           string
  email?:        string
  preferred_username?: string
  given_name?:   string
  family_name?:  string
  realm_access?: { roles: string[] }
  resource_access?: Record<string, { roles: string[] }>
  exp:           number
}

// ─── PKCE helpers ────────────────────────────────────────────────────────────
function randomString(len = 64): string {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => ('0' + b.toString(16)).slice(-2)).join('').slice(0, len)
}

async function sha256Base64Url(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  const bytes = new Uint8Array(hash)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ─── Token storage ───────────────────────────────────────────────────────────
function saveTokens(t: TokenResponse) {
  localStorage.setItem(STORAGE.ACCESS,     t.access_token)
  localStorage.setItem(STORAGE.REFRESH,    t.refresh_token)
  localStorage.setItem(STORAGE.ID,         t.id_token)
  // restamos 30s de margen para no usar un token al borde de expirar
  const expiresAt = Date.now() + (t.expires_in - 30) * 1000
  localStorage.setItem(STORAGE.EXPIRES_AT, String(expiresAt))
}

function clearTokens() {
  localStorage.removeItem(STORAGE.ACCESS)
  localStorage.removeItem(STORAGE.REFRESH)
  localStorage.removeItem(STORAGE.ID)
  localStorage.removeItem(STORAGE.EXPIRES_AT)
}

function getStoredAccessToken(): string | null {
  return localStorage.getItem(STORAGE.ACCESS)
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(STORAGE.REFRESH)
}

function getStoredIdToken(): string | null {
  return localStorage.getItem(STORAGE.ID)
}

function isAccessTokenExpired(): boolean {
  const at = Number(localStorage.getItem(STORAGE.EXPIRES_AT) ?? 0)
  return Date.now() >= at
}

// ─── Login con usuario/contraseña (Direct Access Grants / ROPC) ──────────────
// Form propio del SPA: el usuario tipea email+password, hacemos POST al token
// endpoint con grant_type=password y guardamos los tokens. Sin redirección.
// El client `imedba-frontend` tiene `directAccessGrantsEnabled=true` en el realm.
export async function loginWithPassword(username: string, password: string): Promise<void> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id:  KC_CLIENT,
    username,
    password,
    scope:      'openid profile email',
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let detail = `${res.status}`
    try {
      const parsed = JSON.parse(text) as { error?: string; error_description?: string }
      if (parsed.error_description) detail = parsed.error_description
      else if (parsed.error) detail = parsed.error
    } catch {
      if (text) detail = text
    }
    throw new Error(detail)
  }
  const tokens: TokenResponse = await res.json()
  saveTokens(tokens)
}

// ─── Login con redirect a Keycloak (PKCE) — disponible si se quiere volver ───
export async function login(returnPath = '/dashboard'): Promise<void> {
  const verifier  = randomString(64)
  const challenge = await sha256Base64Url(verifier)
  sessionStorage.setItem(STORAGE.PKCE_VERIFIER, verifier)
  sessionStorage.setItem(STORAGE.RETURN_PATH,   returnPath)

  const params = new URLSearchParams({
    client_id:             KC_CLIENT,
    redirect_uri:          REDIRECT,
    response_type:         'code',
    scope:                 'openid profile email',
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  })
  window.location.assign(`${AUTH_ENDPOINT}?${params.toString()}`)
}

// ─── Callback (intercambio code → tokens) ────────────────────────────────────
export async function handleCallback(): Promise<string> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  if (error) throw new Error(`Keycloak rechazó el login: ${error}`)
  if (!code) throw new Error('Falta el parámetro `code` en la URL de callback')

  const verifier = sessionStorage.getItem(STORAGE.PKCE_VERIFIER)
  if (!verifier) throw new Error('Falta el PKCE verifier (sessión expirada)')

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     KC_CLIENT,
    code,
    redirect_uri:  REDIRECT,
    code_verifier: verifier,
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Token endpoint devolvió ${res.status}: ${text}`)
  }

  const tokens: TokenResponse = await res.json()
  saveTokens(tokens)
  sessionStorage.removeItem(STORAGE.PKCE_VERIFIER)

  const ret = sessionStorage.getItem(STORAGE.RETURN_PATH) ?? '/dashboard'
  sessionStorage.removeItem(STORAGE.RETURN_PATH)
  return ret
}

// ─── Refresh ─────────────────────────────────────────────────────────────────
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refresh = getStoredRefreshToken()
  if (!refresh) throw new Error('No hay refresh token')

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     KC_CLIENT,
    refresh_token: refresh,
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })
  if (!res.ok) {
    clearTokens()
    throw new Error(`Refresh falló con ${res.status}`)
  }
  const tokens: TokenResponse = await res.json()
  saveTokens(tokens)
  return tokens.access_token
}

// Devuelve un access token válido. Si está vencido, refresca antes.
// Coalesces refreshes concurrentes en una sola llamada.
export async function getAccessToken(): Promise<string | null> {
  if (!getStoredAccessToken()) return null
  if (!isAccessTokenExpired()) return getStoredAccessToken()
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
  }
  try { return await refreshPromise } catch { return null }
}

export function isAuthenticated(): boolean {
  return getStoredAccessToken() !== null
}

// ─── Logout ──────────────────────────────────────────────────────────────────
export function logout(): void {
  const idToken = getStoredIdToken()
  clearTokens()
  const params = new URLSearchParams({
    client_id:                KC_CLIENT,
    post_logout_redirect_uri: window.location.origin + '/',
  })
  if (idToken) params.set('id_token_hint', idToken)
  window.location.assign(`${LOGOUT_ENDPOINT}?${params.toString()}`)
}

// ─── Decodificar JWT (para mostrar usuario / roles en UI) ────────────────────
function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.')
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as JwtPayload
  } catch { return null }
}

export interface CurrentUser {
  sub:        string
  email:      string | null
  username:   string | null
  fullName:   string | null
  roles:      string[]            // realm roles (ej. admin, vendedora)
  authorities: string[]           // resource roles (ej. students:read)
}

export function currentUser(): CurrentUser | null {
  const access = getStoredAccessToken()
  if (!access) return null
  const p = decodeJwt(access)
  if (!p) return null
  return {
    sub:         p.sub,
    email:       p.email ?? null,
    username:    p.preferred_username ?? null,
    fullName:    [p.given_name, p.family_name].filter(Boolean).join(' ') || null,
    roles:       p.realm_access?.roles ?? [],
    authorities: p.resource_access?.['imedba-backend']?.roles ?? [],
  }
}

export function hasAuthority(authority: string): boolean {
  return currentUser()?.authorities.includes(authority) ?? false
}

export function hasRole(role: string): boolean {
  return currentUser()?.roles.includes(role) ?? false
}
