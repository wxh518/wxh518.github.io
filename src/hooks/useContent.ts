import { useCallback, useEffect, useState } from 'react'

export function useContent<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: string | null }>({ data: undefined, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setState({ data: undefined, loading: true, error: null })
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: null })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ data: undefined, loading: false, error: error instanceof Error ? error.message : '加载失败，请稍后重试' })
    })
    return () => controller.abort()
  }, [load, attempt])
  return { ...state, retry }
}
