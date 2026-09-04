import type { Axis, Cadence, Challenge, ChallengeLog } from '../types'
import { SEED_CHALLENGES } from '../seed/challenges'

export const CHALLENGES = SEED_CHALLENGES

/**
 * 챌린지 선택은 규칙으로 충분합니다 — LLM을 부를 이유가 없는 대표적인 자리.
 * 최근에 나온 건 빼고, 기록이 적은 축에 무게를 싣고, 날짜로 고정해
 * 같은 날 앱을 몇 번 열어도 같은 문항이 나오게 합니다.
 */
export function pickChallenge(
  cadence: Cadence,
  weakAxes: Axis[],
  logs: ChallengeLog[],
  seed: string,
): Challenge | undefined {
  const recent = new Set(
    logs
      .filter((l) => Date.now() - l.completedAt < 14 * 86_400_000)
      .map((l) => l.challengeId),
  )
  const pool = CHALLENGES.filter((c) => c.cadence === cadence && !recent.has(c.id))
  const candidates = pool.length ? pool : CHALLENGES.filter((c) => c.cadence === cadence)
  if (!candidates.length) return undefined

  const weighted = candidates.filter((c) => weakAxes.includes(c.axis))
  const finalPool = weighted.length ? weighted : candidates

  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return finalPool[hash % finalPool.length]
}

export function challengeById(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id)
}
