import type { Entry } from '../types'
import { formatKo, formatRange } from './date'

/** 성과 기록용 STAR 골격 — 빈 화면을 마주하지 않게 하는 게 목적입니다. */
export const STAR_TEMPLATE = `## 상황
어떤 문제/맥락이었나

## 내가 한 일
구체적으로 무엇을 했나

## 결과
숫자로 말할 수 있으면 숫자로

## 배운 것
`

export function retroTemplate(
  unit: 'week' | 'month',
  range: [string, string],
  entries: Entry[],
): string {
  const done = entries
    .filter((e) => e.type === '성과')
    .map((e) => `- ${formatKo(e.occurredAt)} · ${e.title || '(제목 없음)'}`)
  const learned = entries
    .filter((e) => e.type === '학습')
    .map((e) => `- ${e.title || '(제목 없음)'}`)
  const feedback = entries
    .filter((e) => e.type === '피드백')
    .map((e) => `- ${e.title || '(제목 없음)'}`)

  const label = unit === 'week' ? '이번 주' : '이번 달'
  const lines = [
    `_${formatRange(range)}_`,
    '',
    `## ${label}에 한 일`,
    done.length ? done.join('\n') : '- (기록된 성과 없음)',
    '',
    '## 잘된 것',
    '- ',
    '',
    '## 아쉬운 것',
    '- ',
    '',
    '## 배운 것',
    learned.length ? learned.join('\n') : '- ',
    '',
  ]
  if (feedback.length) lines.push('## 받은 피드백', feedback.join('\n'), '')
  lines.push(`## 다음 ${unit === 'week' ? '주' : '달'}에 할 것`, '- ', '')
  return lines.join('\n')
}

export function retroTitle(unit: 'week' | 'month', range: [string, string]): string {
  const start = new Date(range[0])
  if (unit === 'month') return `${start.getFullYear()}년 ${start.getMonth() + 1}월 회고`
  const week = Math.ceil((start.getDate() + 6) / 7)
  return `${start.getMonth() + 1}월 ${week}주차 회고`
}
