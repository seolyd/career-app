import type { Axis, Entry } from '../types'
import { AXES } from '../types'

/** 집계는 전부 코드로. 이런 데 모델을 부르면 느리고 틀립니다. */

export function axisCounts(entries: Entry[]): Array<[Axis, number]> {
  const map = new Map<Axis, number>(AXES.map((a) => [a, 0]))
  for (const e of entries) map.set(e.axis, (map.get(e.axis) ?? 0) + 1)
  return [...map.entries()]
}

/** 최근 기록이 가장 적은 축 — 챌린지가 이쪽으로 편향됩니다. */
export function weakestAxes(entries: Entry[], n = 3): Axis[] {
  return axisCounts(entries)
    .sort((a, b) => a[1] - b[1])
    .slice(0, n)
    .map(([a]) => a)
}

export interface Calibration {
  reviewed: number
  hit: number
  partial: number
  miss: number
  /** 리뷰일이 지났는데 아직 판정 안 한 결정 */
  overdue: number
  hitRate: number | null
}

export function calibration(entries: Entry[], today: string): Calibration {
  const decisions = entries.filter((e) => e.type === 'Decision')
  const reviewed = decisions.filter((e) => e.verdict)
  const hit = reviewed.filter((e) => e.verdict === 'Hit').length
  const partial = reviewed.filter((e) => e.verdict === 'Partial').length
  const miss = reviewed.filter((e) => e.verdict === 'Miss').length
  const overdue = decisions.filter((e) => e.reviewDate && e.reviewDate <= today && !e.verdict).length
  return {
    reviewed: reviewed.length,
    hit,
    partial,
    miss,
    overdue,
    hitRate: reviewed.length ? Math.round((hit / reviewed.length) * 100) : null,
  }
}

/** 오늘 다시 마주해야 할 것들 */
export function dueToday(entries: Entry[], today: string): Entry[] {
  return entries
    .filter((e) => e.type === 'Decision' && e.reviewDate && e.reviewDate <= today && !e.verdict)
    .sort((a, b) => (a.reviewDate ?? '').localeCompare(b.reviewDate ?? ''))
}

/** 1년 전 오늘 — 없으면 undefined */
export function oneYearAgo(entries: Entry[], today: string): Entry | undefined {
  const target = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`
  return entries.find((e) => e.occurredAt === target)
}
