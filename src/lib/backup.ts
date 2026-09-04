import { db } from '../db'
import type { BackupFile, Entry } from '../types'
import { ENTRY_TYPES, AXES } from '../types'

export async function buildBackup(): Promise<BackupFile> {
  const [entries, vision, phases, yearGoals, weekGoals, advisors, sessions, asks, challengeLogs] =
    await Promise.all([
      db.entries.toArray(),
      db.vision.toArray(),
      db.phases.toArray(),
      db.yearGoals.toArray(),
      db.weekGoals.toArray(),
      db.advisors.toArray(),
      db.sessions.toArray(),
      db.asks.toArray(),
      db.challengeLogs.toArray(),
    ])
  return {
    app: 'career-app',
    version: 2,
    exportedAt: new Date().toISOString(),
    entries,
    vision,
    phases,
    yearGoals,
    weekGoals,
    advisors,
    sessions,
    asks,
    challengeLogs,
  }
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadJSON(data: unknown, filename: string): void {
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}

export function downloadText(text: string, filename: string): void {
  download(new Blob([text], { type: 'text/markdown;charset=utf-8' }), filename)
}

function isEntry(v: unknown): v is Entry {
  const e = v as Partial<Entry>
  return (
    !!e &&
    typeof e.id === 'string' &&
    typeof e.body === 'string' &&
    typeof e.occurredAt === 'string' &&
    ENTRY_TYPES.includes(e.type as Entry['type']) &&
    AXES.includes(e.axis as Entry['axis'])
  )
}

const hasId = (v: unknown): v is { id: string; updatedAt?: number } =>
  !!v && typeof (v as { id?: unknown }).id === 'string'

export interface ImportResult {
  restored: number
  skipped: number
}

/**
 * 덮어쓰기가 아니라 병합입니다. 같은 id는 updatedAt이 더 최신인 쪽만 남으므로
 * 같은 백업을 두 번 넣어도 중복이 생기지 않습니다.
 */
export async function importBackup(raw: string): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Not valid JSON.')
  }
  const file = parsed as Partial<BackupFile> & { goals?: unknown[] }
  if (file?.app !== 'career-app') throw new Error('This backup was not made by this app.')
  if (file.version !== 2) {
    throw new Error('This is a v1 backup. Open the app once so it migrates, then export again.')
  }

  let restored = 0
  let skipped = 0

  const tables = [
    db.entries,
    db.vision,
    db.phases,
    db.yearGoals,
    db.weekGoals,
    db.advisors,
    db.sessions,
    db.asks,
    db.challengeLogs,
  ] as const
  const payloads: unknown[][] = [
    file.entries ?? [],
    file.vision ?? [],
    file.phases ?? [],
    file.yearGoals ?? [],
    file.weekGoals ?? [],
    file.advisors ?? [],
    file.sessions ?? [],
    file.asks ?? [],
    file.challengeLogs ?? [],
  ]

  await db.transaction('rw', tables, async () => {
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i] as { get: (id: string) => Promise<unknown>; put: (v: never) => Promise<unknown> }
      for (const row of payloads[i]) {
        const valid = i === 0 ? isEntry(row) : hasId(row)
        if (!valid) {
          skipped += 1
          continue
        }
        const record = row as { id: string; updatedAt?: number }
        const existing = (await table.get(record.id)) as { updatedAt?: number } | undefined
        if (existing && (existing.updatedAt ?? 0) >= (record.updatedAt ?? 0)) continue
        await table.put(record as never)
        restored += 1
      }
    }
  })

  return { restored, skipped }
}

export async function estimateStorage(): Promise<string> {
  if (!navigator.storage?.estimate) return 'unknown'
  const { usage } = await navigator.storage.estimate()
  if (usage == null) return 'unknown'
  if (usage < 1024 * 1024) return `${Math.max(1, Math.round(usage / 1024))} KB`
  return `${(usage / 1024 / 1024).toFixed(1)} MB`
}
