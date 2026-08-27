import Dexie, { type EntityTable } from 'dexie'
import type { Entry, Goal } from './types'

/**
 * 전부 이 기기 안에만 저장됩니다. 서버는 없습니다.
 * 그래서 설정 화면의 백업(JSON 내보내기)이 유일한 안전장치입니다.
 */
export const db = new Dexie('career-app') as Dexie & {
  entries: EntityTable<Entry, 'id'>
  goals: EntityTable<Goal, 'id'>
}

db.version(1).stores({
  entries: 'id, type, occurredAt, updatedAt, *tags, *goalIds',
  goals: 'id, kind, status, updatedAt',
})

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
