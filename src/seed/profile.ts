import type { Profile } from '../types'

/**
 * 첫 실행에 자동으로 깔리는 기본 프로필입니다. 덕분에 앱을 열자마자 바로 씁니다.
 *
 * 회사명·직급·연차처럼 사람을 특정하는 말은 여기 두지 않습니다 — 배포된 번들은
 * 주소만 알면 누구나 읽을 수 있습니다. 그런 내용은 설정에서 직접 적으시면
 * 이 기기의 IndexedDB에만 남습니다.
 */
export const DEFAULT_ROLE =
  'a product manager responsible for HR products — recruiting and people platforms, and the AI features on top of them'

export function defaultProfile(now = Date.now()): Profile {
  return { id: 'profile', role: DEFAULT_ROLE, context: '', situation: '', updatedAt: now }
}

/** 아직 손대지 않은 기본값인지 — Today의 안내 한 줄을 띄울지 판단합니다. */
export function isDefaultProfile(p: Profile | undefined): boolean {
  return !p || (p.role === DEFAULT_ROLE && !p.context.trim() && !p.situation.trim())
}
