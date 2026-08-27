import { db } from '../db'
import type { BackupFile, Entry, Goal } from '../types'
import { ENTRY_TYPES, GOAL_KINDS, GOAL_STATUSES } from '../types'

export async function buildBackup(): Promise<BackupFile> {
  const [entries, goals] = await Promise.all([db.entries.toArray(), db.goals.toArray()])
  return { app: 'career-app', version: 1, exportedAt: new Date().toISOString(), entries, goals }
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function isEntry(v: unknown): v is Entry {
  const e = v as Partial<Entry>
  return (
    !!e &&
    typeof e.id === 'string' &&
    typeof e.body === 'string' &&
    typeof e.occurredAt === 'string' &&
    ENTRY_TYPES.includes(e.type as Entry['type'])
  )
}

function isGoal(v: unknown): v is Goal {
  const g = v as Partial<Goal>
  return (
    !!g &&
    typeof g.id === 'string' &&
    typeof g.title === 'string' &&
    GOAL_KINDS.includes(g.kind as Goal['kind']) &&
    GOAL_STATUSES.includes(g.status as Goal['status'])
  )
}

export interface ImportResult {
  entries: number
  goals: number
  skipped: number
}

/**
 * 같은 id면 updatedAt이 더 최신인 쪽만 남깁니다.
 * 덮어쓰기가 아니라 병합이라, 백업 파일을 두 번 넣어도 중복이 생기지 않습니다.
 */
export async function importBackup(raw: string): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('JSON 형식이 아닙니다.')
  }
  const file = parsed as Partial<BackupFile>
  if (file?.app !== 'career-app') throw new Error('이 앱에서 만든 백업 파일이 아닙니다.')

  const entries = (file.entries ?? []).filter(isEntry)
  const goals = (file.goals ?? []).filter(isGoal)
  const skipped =
    (file.entries?.length ?? 0) - entries.length + ((file.goals?.length ?? 0) - goals.length)

  let written = { entries: 0, goals: 0 }
  await db.transaction('rw', db.entries, db.goals, async () => {
    for (const e of entries) {
      const existing = await db.entries.get(e.id)
      if (existing && existing.updatedAt >= e.updatedAt) continue
      await db.entries.put({ ...e, tags: e.tags ?? [], goalIds: e.goalIds ?? [] })
      written.entries += 1
    }
    for (const g of goals) {
      const existing = await db.goals.get(g.id)
      if (existing && existing.updatedAt >= g.updatedAt) continue
      await db.goals.put(g)
      written.goals += 1
    }
  })

  return { ...written, skipped }
}

export async function estimateStorage(): Promise<string> {
  if (!navigator.storage?.estimate) return '알 수 없음'
  const { usage } = await navigator.storage.estimate()
  if (usage == null) return '알 수 없음'
  if (usage < 1024 * 1024) return `${Math.max(1, Math.round(usage / 1024))} KB`
  return `${(usage / 1024 / 1024).toFixed(1)} MB`
}
