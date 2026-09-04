import Dexie, { type EntityTable } from 'dexie'
import type {
  Advisor,
  Ask,
  ChallengeLog,
  Entry,
  FeedState,
  Phase,
  Profile,
  Session,
  Vision,
  WeekGoal,
  YearGoal,
} from './types'
import { SEED_ADVISORS } from './seed/advisors'
import { SEED_PHASES } from './seed/plan'

/**
 * 전부 이 기기 안에만 저장됩니다. 서버는 없습니다.
 * 그래서 설정 화면의 백업(JSON 내보내기)이 유일한 안전장치입니다.
 */
export const db = new Dexie('career-app') as Dexie & {
  entries: EntityTable<Entry, 'id'>
  profile: EntityTable<Profile, 'id'>
  vision: EntityTable<Vision, 'id'>
  phases: EntityTable<Phase, 'id'>
  yearGoals: EntityTable<YearGoal, 'id'>
  weekGoals: EntityTable<WeekGoal, 'id'>
  advisors: EntityTable<Advisor, 'id'>
  sessions: EntityTable<Session, 'id'>
  asks: EntityTable<Ask, 'id'>
  challengeLogs: EntityTable<ChallengeLog, 'id'>
  feedStates: EntityTable<FeedState, 'feedItemId'>
}

/** v1: 성과/회고/학습/피드백 4타입 + goals 테이블 (첫 프로토타입) */
db.version(1).stores({
  entries: 'id, type, occurredAt, updatedAt, *tags, *goalIds',
  goals: 'id, kind, status, updatedAt',
})

/** v2: PM 일의 6타입 + 역량 축 + 10년 플래너 + 보드 + LLM 왕복 */
db.version(2)
  .stores({
    entries: 'id, type, axis, occurredAt, updatedAt, reviewDate, yearGoalId, publishable, *tags',
    goals: null,
    vision: 'id',
    phases: 'id, order',
    yearGoals: 'id, phaseId, year, status',
    weekGoals: 'id, yearGoalId, weekOf, status',
    advisors: 'id, order, active',
    sessions: 'id, createdAt, entryId',
    asks: 'id, kind, status, createdAt, originId',
    challengeLogs: 'id, challengeId, completedAt',
  })
  .upgrade(async (tx) => {
    // v1의 4타입을 새 6타입으로 옮깁니다. 잃는 기록이 없도록 전부 매핑합니다.
    const TYPE_MAP: Record<string, Entry['type']> = {
      성과: 'Decision',
      회고: 'Reflection',
      학습: 'Input',
      피드백: 'People',
    }
    await tx
      .table('entries')
      .toCollection()
      .modify((e: Record<string, unknown>) => {
        e.type = TYPE_MAP[e.type as string] ?? 'Reflection'
        e.axis = 'Execution'
        delete e.goalIds
      })
  })

/** v3: 읽은 피드 항목의 흔적 */
db.version(3).stores({ feedStates: 'feedItemId, readAt' })

/** v4: LLM 페르소나를 코드에서 빼고 기기 안으로 */
db.version(4).stores({ profile: 'id' })

/** 첫 실행에 좌석과 플래너 초안을 깔아둡니다. 이미 있으면 건드리지 않습니다. */
export async function seedIfEmpty(): Promise<void> {
  if ((await db.advisors.count()) === 0) await db.advisors.bulkAdd(SEED_ADVISORS)
  if ((await db.phases.count()) === 0) await db.phases.bulkAdd(SEED_PHASES)
  // 연 목표는 비워둡니다 — 본인 것을 앱에서 직접 적는 게 맞습니다.
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
