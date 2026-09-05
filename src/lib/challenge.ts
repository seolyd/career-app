import type { Axis, Cadence, Challenge, ChallengeLog } from '../types'
import { SEED_CHALLENGES } from '../seed/challenges'

export const CHALLENGES = SEED_CHALLENGES

/**
 * 최근에 한 문항을 다시 내보내지 않는 기간. 문항이 120개(daily 70 / weekly 50)로
 * 늘면서 45일로 잡았습니다 — 약한 축이 한동안 고정돼 있어도 daily 70개를
 * 전부 도는 최소 값입니다. 이보다 짧으면 같은 축의 문항만 반복해서 돌아옵니다.
 */
const REPEAT_WINDOW_DAYS = 45

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
      .filter((l) => Date.now() - l.completedAt < REPEAT_WINDOW_DAYS * 86_400_000)
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
