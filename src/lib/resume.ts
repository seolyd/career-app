import type { Entry, Goal } from '../types'
import { formatKo } from './date'

export type GroupBy = '태그' | '기간' | '없음'

function monthKey(iso: string): string {
  const [y, m] = iso.split('-')
  return `${y}년 ${Number(m)}월`
}

/**
 * 고른 기록을 경력기술서 초안 마크다운으로 묶습니다.
 * 문장을 지어내지 않고 쓴 것만 옮깁니다 — 여기서 나온 초안을 다듬어 쓰는 용도입니다.
 */
export function buildResume(
  entries: Entry[],
  goals: Goal[],
  opts: { title: string; groupBy: GroupBy; includeBody: boolean },
): string {
  const sorted = [...entries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const out: string[] = [`# ${opts.title || '경력기술서'}`, '']

  if (sorted.length === 0) {
    out.push('_조건에 맞는 기록이 없습니다._', '')
    return out.join('\n')
  }

  const groups = new Map<string, Entry[]>()
  for (const e of sorted) {
    const keys =
      opts.groupBy === '태그'
        ? e.tags.length
          ? e.tags
          : ['태그 없음']
        : opts.groupBy === '기간'
          ? [monthKey(e.occurredAt)]
          : ['전체']
    for (const k of keys) {
      const bucket = groups.get(k)
      if (bucket) bucket.push(e)
      else groups.set(k, [e])
    }
  }

  for (const [group, items] of groups) {
    if (opts.groupBy !== '없음') out.push(`## ${group}`, '')
    for (const e of items) {
      out.push(`### ${e.title || '(제목 없음)'}`)
      out.push(`_${formatKo(e.occurredAt)}${e.tags.length ? ` · ${e.tags.join(', ')}` : ''}_`, '')
      if (opts.includeBody && e.body.trim()) out.push(e.body.trim(), '')
    }
  }

  const skills = goals.filter((g) => g.kind === '스킬')
  if (skills.length) {
    out.push('## 스킬', '')
    out.push(skills.map((g) => `- ${g.title}${g.detail ? ` — ${g.detail}` : ''}`).join('\n'), '')
  }

  return out.join('\n')
}
