// Capitaliza la primera letra de cada palabra (cubre nombres y apellidos
// tipeados en minúscula o mayúscula). Respeta separadores: espacio, guion y
// apóstrofo (ej. "d'amico" → "D'Amico", "garcía-lópez" → "García-López").
export function toTitleCase(input: string): string {
  return input
    .toLocaleLowerCase('es-AR')
    .replace(/(^|[\s'’\-])(\p{L})/gu, (_m, sep: string, ch: string) =>
      sep + ch.toLocaleUpperCase('es-AR'))
}
