/* ── 기록 ─────────────────────────────────────────────── */

export const ENTRY_TYPES = ['Decision', 'Ship', 'Signal', 'People', 'Reflection', 'Input'] as const
export type EntryType = (typeof ENTRY_TYPES)[number]

export const AXES = [
  'Product Sense',
  'Execution',
  'Strategy',
  'Data',
  'Influence',
  'People',
  'Domain',
] as const
export type Axis = (typeof AXES)[number]

export const VERDICTS = ['Hit', 'Partial', 'Miss'] as const
export type Verdict = (typeof VERDICTS)[number]

export interface Entry {
  id: string
  type: EntryType
  title: string
  /** 마크다운 본문 */
  body: string
  axis: Axis
  tags: string[]
  occurredAt: string
  createdAt: number
  updatedAt: number

  /** 어느 연 목표에 기여했나 */
  yearGoalId?: string
  /** 나중에 밖으로 낼 글감이 될 만한가 — P4로 가는 씨앗 */
  publishable?: boolean

  /* 결정 전용 */
  alternatives?: string
  prediction?: string
  failCondition?: string
  reviewDate?: string
  reviewedAt?: number
  verdict?: Verdict
  missed?: string
  /** Build vs Buy 전용 서식 */
  buildBuy?: BuildBuy

  /* 출시·실험 전용 */
  hypothesis?: string
  metric?: string
  result?: string
  /** 이 기능이 틀렸을 때 누가 언제 아는가 */
  howWeKnowItsWrong?: string

  /* 인풋 전용 */
  sourceUrl?: string
  soWhat?: string
}

export interface BuildBuy {
  /** 이걸 파는 제품과 가격 */
  market: string
  /** 왜 우리는 남의 것을 못 쓰는가 — 한 문장 */
  specialness: string
  /** 3년 뒤 누가 유지하나 */
  upkeep: string
  /** 사면 잃는 것 */
  costOfBuying: string
  /** 되돌리는 비용 */
  reversalCost: string
}

export const BUILD_BUY_FIELDS: Array<{ key: keyof BuildBuy; label: string; hint: string }> = [
  { key: 'market', label: 'Who sells this, and for how much', hint: 'Assuming nobody sells it is the most common mistake' },
  { key: 'specialness', label: 'Why we are different (one sentence)', hint: 'If that sentence fits any other company, we are not different' },
  { key: 'upkeep', label: 'Who maintains it in 3 years', hint: 'What happens when you leave this team?' },
  { key: 'costOfBuying', label: 'What buying costs us', hint: 'Data ownership, customization, integration effort — which one?' },
  { key: 'reversalCost', label: 'Cost to reverse', hint: 'What would it take to flip this decision a year from now?' },
]

/* ── 프로필 ───────────────────────────────────────────── */

/**
 * LLM 프롬프트의 페르소나. 코드에 박아두면 배포된 번들에서 누구나 읽을 수 있고,
 * 자리가 바뀔 때마다 코드를 고쳐야 하므로 기기 안에만 둡니다.
 */
export interface Profile {
  id: 'profile'
  role: string
  context: string
  situation: string
  updatedAt: number
}

/* ── 10년 플래너 ──────────────────────────────────────── */

export interface Vision {
  id: 'vision'
  text: string
  why: string
  updatedAt: number
}

export interface Phase {
  id: string
  order: number
  name: string
  /** 이 단계가 답해야 하는 질문 */
  question: string
  /** 끝났다고 말할 수 있는 조건 */
  doneWhen: string
  startYear: number
  endYear: number
  updatedAt: number
}

export const GOAL_STATUSES = ['Active', 'Done', 'Paused'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export interface YearGoal {
  id: string
  phaseId: string
  year: number
  title: string
  doneWhen: string
  status: GoalStatus
  updatedAt: number
}

export const WEEK_STATUSES = ['Open', 'Done', 'Rolled', 'Dropped'] as const
export type WeekStatus = (typeof WEEK_STATUSES)[number]

export interface WeekGoal {
  id: string
  yearGoalId: string
  /** 그 주 월요일의 ISO 날짜 */
  weekOf: string
  title: string
  status: WeekStatus
  judgedAt?: number
  createdAt: number
}

/* ── Board of Advisors ────────────────────────────────── */

export interface Advisor {
  id: string
  seat: string
  name: string
  /** 한 줄 렌즈 */
  lens: string
  /** 이 사람이 반복해서 던지는 질문 */
  questions: string[]
  order: number
  active: boolean
}

export interface Session {
  id: string
  problem: string
  /** 저널 기록에서 시작했다면 그 id */
  entryId?: string
  advisorIds: string[]
  /** `${advisorId}:${질문 index}` → 내가 먼저 쓴 답 */
  selfAnswers: Record<string, string>
  actionItems: string[]
  createdAt: number
  updatedAt: number
}

/* ── 하이브리드 LLM 왕복 ──────────────────────────────── */

export const ASK_KINDS = [
  'classify',
  'board',
  'weekly',
  'autopsy',
  'digest',
  'breakdown',
  'principles',
  'gap',
  'narrative',
  'buildbuy',
] as const
export type AskKind = (typeof ASK_KINDS)[number]

export const ASK_STATUSES = ['Draft', 'Copied', 'Answered'] as const
export type AskStatus = (typeof ASK_STATUSES)[number]

/**
 * LLM 왕복 한 건. 앱은 프롬프트만 만들고, 실행은 휴대폰의 LLM 앱이 합니다.
 * 답을 붙여넣으면 여기 남고, 원래 화면으로 결과가 돌아갑니다.
 */
export interface Ask {
  id: string
  kind: AskKind
  /** 사람이 읽는 제목 */
  title: string
  prompt: string
  reply?: string
  /** 답 안의 ```json 블록을 파싱한 것 */
  parsed?: unknown
  status: AskStatus
  originType?: 'entry' | 'session' | 'yearGoal' | 'week'
  originId?: string
  createdAt: number
  repliedAt?: number
}

/* ── 챌린지 ───────────────────────────────────────────── */

export const CADENCES = ['daily', 'weekly'] as const
export type Cadence = (typeof CADENCES)[number]

export interface Challenge {
  id: string
  cadence: Cadence
  axis: Axis
  minutes: number
  prompt: string
}

export interface ChallengeLog {
  id: string
  challengeId: string
  entryId?: string
  completedAt: number
}

/* ── 읽기 ─────────────────────────────────────────────── */

/** 피드 항목의 읽음 상태. 항목 자체는 feed.json에 있고 여기엔 내 흔적만 남습니다. */
export interface FeedState {
  feedItemId: string
  readAt: number
  note?: string
  entryId?: string
  /** 팟캐스트 이어듣기 위치(초). 색인이 없는 필드라 스키마 변경은 필요 없습니다. */
  positionSec?: number
}

/* ── 백업 ─────────────────────────────────────────────── */

export interface BackupFile {
  app: 'career-app'
  version: 2
  exportedAt: string
  entries: Entry[]
  profile: Profile[]
  vision: Vision[]
  phases: Phase[]
  yearGoals: YearGoal[]
  weekGoals: WeekGoal[]
  advisors: Advisor[]
  sessions: Session[]
  asks: Ask[]
  challengeLogs: ChallengeLog[]
  feedStates: FeedState[]
}
