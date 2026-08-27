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

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function formatKo(iso: string): string {
  const d = parseISODate(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
}

export function formatRange([from, to]: [string, string]): string {
  const a = parseISODate(from)
  const b = parseISODate(to)
  return `${a.getFullYear()}. ${a.getMonth() + 1}. ${a.getDate()} – ${b.getMonth() + 1}. ${b.getDate()}`
}

/** 오늘로부터 며칠 전인지 사람이 읽는 형태로 */
export function relativeKo(iso: string): string {
  const diff = Math.round(
    (parseISODate(today()).getTime() - parseISODate(iso).getTime()) / 86_400_000,
  )
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  if (diff === 2) return '그저께'
  if (diff > 0 && diff < 7) return `${diff}일 전`
  if (diff < 0) return `${-diff}일 뒤`
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
