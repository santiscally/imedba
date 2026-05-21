import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { BusinessUnit } from '../types/course'

// Segmentación Residencias ↔ Formación Superior (reunión IMEDBA 2026-04-24).
// Selector global que filtra las vistas académicas (Cursos, Alumnos, Inscripciones).
// 'TODAS' = ver ambas (lo usan los socios). Persiste en localStorage.
export type Unidad = 'TODAS' | 'RESIDENCIAS' | 'FORMACION_SUPERIOR'

export const UNIDAD_LABELS: Record<Unidad, string> = {
  TODAS:              'Todas las unidades',
  RESIDENCIAS:        'Residencias Médicas',
  FORMACION_SUPERIOR: 'Formación Superior',
}

const STORAGE_KEY = 'imedba.unidad'

interface UnidadCtx {
  unidad:    Unidad
  setUnidad: (u: Unidad) => void
}

const Ctx = createContext<UnidadCtx | null>(null)

function readInitial(): Unidad {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'RESIDENCIAS' || v === 'FORMACION_SUPERIOR' ? v : 'TODAS'
}

export function UnidadProvider({ children }: { children: ReactNode }) {
  const [unidad, setUnidadState] = useState<Unidad>(readInitial)
  const setUnidad = useCallback((u: Unidad) => {
    setUnidadState(u)
    localStorage.setItem(STORAGE_KEY, u)
  }, [])
  return <Ctx.Provider value={{ unidad, setUnidad }}>{children}</Ctx.Provider>
}

export function useUnidad(): UnidadCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUnidad debe usarse dentro de <UnidadProvider>')
  return ctx
}

// businessUnit para filtrar las queries, o undefined si es 'TODAS'.
export function unidadBusinessUnit(u: Unidad): BusinessUnit | undefined {
  return u === 'TODAS' ? undefined : u
}
