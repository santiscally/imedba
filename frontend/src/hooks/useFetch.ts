import { useEffect, useState } from 'react'
import { apiGet } from '../api/client'

export interface FetchState<T> {
  data:    T | null
  loading: boolean
  error:   string | null
}

export function useFetch<T>(path: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null, loading: true, error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    setState({ data: null, loading: true, error: null })

    apiGet<T>(path, controller.signal)
      .then(data => setState({ data, loading: false, error: null }))
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setState({ data: null, loading: false, error: err.message })
      })

    return () => controller.abort()
  }, [path])

  return state
}
