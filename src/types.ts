export const ENTRY_TYPES = ['성과', '회고', '학습', '피드백'] as const
export type EntryType = (typeof ENTRY_TYPES)[number]

export interface Entry {
  id: string
  type: EntryType
  title: string
  /** 마크다운 본문 */
  body: string
  tags: string[]
  /** 연결된 목표/스킬 id 목록 */
  goalIds: string[]
  /** 실제로 있었던 날 (YYYY-MM-DD) */
  occurredAt: string
  createdAt: number
  updatedAt: number
}

export const GOAL_KINDS = ['목표', '스킬'] as const
export type GoalKind = (typeof GOAL_KINDS)[number]

export const GOAL_STATUSES = ['진행중', '완료', '보류'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export interface Goal {
  id: string
  kind: GoalKind
  title: string
  detail: string
  status: GoalStatus
  /** 목표 기한 (YYYY-MM-DD), 스킬에는 보통 비어 있음 */
  targetDate: string
  createdAt: number
  updatedAt: number
}

export interface BackupFile {
  app: 'career-app'
  version: 1
  exportedAt: string
  entries: Entry[]
  goals: Goal[]
}
