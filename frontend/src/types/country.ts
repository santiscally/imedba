// Países (ISO-3166 alpha-2). Sudamérica sin Guyana / Surinam / Guayana Francesa,
// más "Otro" (XX, código user-assigned de ISO-3166).
// Reutilizable en cualquier selector de país (cursos, nacionalidad de alumnos, etc.).
export type Country =
  | 'AR' | 'BO' | 'BR' | 'CL' | 'CO' | 'EC' | 'PY' | 'PE' | 'UY' | 'VE' | 'XX'

export const COUNTRIES: Country[] = [
  'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'PY', 'PE', 'UY', 'VE', 'XX',
]

export const COUNTRY_LABELS: Record<Country, string> = {
  AR: 'Argentina',
  BO: 'Bolivia',
  BR: 'Brasil',
  CL: 'Chile',
  CO: 'Colombia',
  EC: 'Ecuador',
  PY: 'Paraguay',
  PE: 'Perú',
  UY: 'Uruguay',
  VE: 'Venezuela',
  XX: 'Otro',
}

// Etiqueta para mostrar un código guardado (cae al propio código si es legacy/desconocido).
export function countryLabel(code: string | null | undefined): string | null {
  if (!code) return null
  return COUNTRY_LABELS[code as Country] ?? code
}
