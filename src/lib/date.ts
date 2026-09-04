export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return toISODate(new Date())
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** 월요일 시작 주의 [시작, 끝] ISO 날짜 */
export function weekRange(base = new Date()): [string, string] {
  const d = new Date(base)
  const offset = (d.getDay() + 6) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - offset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return [toISODate(start), toISODate(end)]
}

export function monthRange(base = new Date()): [string, string] {
  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return [toISODate(start), toISODate(end)]
}

export function shiftRange(range: [string, string], unit: 'week' | 'month', delta: number): [string, string] {
  const base = parseISODate(range[0])
  if (unit === 'week') {
    base.setDate(base.getDate() + delta * 7)
    return weekRange(base)
  }
  base.setMonth(base.getMonth() + delta)
  return monthRange(base)
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatKo(iso: string): string {
  const d = parseISODate(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

export function formatRange([from, to]: [string, string]): string {
  const a = parseISODate(from)
  const b = parseISODate(to)
  return `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`
}

/** 오늘로부터 며칠 전인지 사람이 읽는 형태로 */
export function relativeKo(iso: string): string {
  const diff = Math.round(
    (parseISODate(today()).getTime() - parseISODate(iso).getTime()) / 86_400_000,
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === 2) return '2 days ago'
  if (diff > 0 && diff < 7) return `${diff} days ago`
  if (diff < 0) return `in ${-diff} days`
  return formatKo(iso)
}

/** 오늘(또는 어제)부터 거꾸로 이어지는 기록 연속 일수 */
export function streakDays(dates: string[]): number {
  const set = new Set(dates)
  const cursor = new Date()
  if (!set.has(toISODate(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!set.has(toISODate(cursor))) return 0
  }
  let count = 0
  while (set.has(toISODate(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

/** 그 날짜가 속한 주의 월요일 (주 목표의 키) */
export function weekOf(base = new Date()): string {
  return weekRange(base)[0]
}

/** weekOf 값으로부터 그 주의 [월, 일] 범위 */
export function rangeOfWeek(monday: string): [string, string] {
  const start = parseISODate(monday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return [monday, toISODate(end)]
}

/** 이번 주에 남은 날 수 (오늘 포함) */
export function daysLeftInWeek(): number {
  const [, end] = weekRange()
  const diff = Math.round(
    (parseISODate(end).getTime() - parseISODate(today()).getTime()) / 86_400_000,
  )
  return Math.max(0, diff) + 1
}

export function quarterRange(base = new Date()): [string, string] {
  const q = Math.floor(base.getMonth() / 3)
  return [
    toISODate(new Date(base.getFullYear(), q * 3, 1)),
    toISODate(new Date(base.getFullYear(), q * 3 + 3, 0)),
  ]
}

export function quarterLabel(base = new Date()): string {
  return `Q${Math.floor(base.getMonth() / 3) + 1} ${base.getFullYear()}`
}

/** 10년 계획에서 지금 어디쯤인지 (0~1) */
export function planProgress(startYear: number, endYear: number): number {
  const start = new Date(startYear, 0, 1).getTime()
  const end = new Date(endYear + 1, 0, 1).getTime()
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)))
}

/** 타임스탬프를 ISO 날짜로 (relativeKo에 넘기기 위해) */
export function isoFromTs(ts: number): string {
  return toISODate(new Date(ts))
}
