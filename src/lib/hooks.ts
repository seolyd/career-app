import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

/** 입력이 멈춘 뒤에만 실행 — 저장 버튼 없이 쓰기 위한 장치입니다. */
export function useDebouncedEffect(fn: () => void, deps: unknown[], delay = 500): void {
  const saved = useRef(fn)
  saved.current = fn
  useEffect(() => {
    const id = setTimeout(() => saved.current(), delay)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay])
}

export function useAllTags(): string[] {
  return (
    useLiveQuery(async () => {
      const entries = await db.entries.toArray()
      const counts = new Map<string, number>()
      for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
    }, []) ?? []
  )
}
