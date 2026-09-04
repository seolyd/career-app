import type { Phase } from '../types'

const now = Date.now()

/**
 * 뼈대만 깝니다. 이름·질문·조건은 본인이 앱에서 채웁니다 —
 * 개인적인 내용을 코드에 박아두면 배포된 번들에서 누구나 읽을 수 있습니다.
 *
 * 10년을 균등하게 4등분하지 않습니다. 가까울수록 해상도가 높으니
 * 앞이 짧고 뒤가 깁니다 (2·2·3·3년).
 */
const START = new Date().getFullYear()

export const SEED_PHASES: Phase[] = [
  { id: 'p1', order: 1, startYear: START, endYear: START + 1 },
  { id: 'p2', order: 2, startYear: START + 2, endYear: START + 3 },
  { id: 'p3', order: 3, startYear: START + 4, endYear: START + 6 },
  { id: 'p4', order: 4, startYear: START + 7, endYear: START + 9 },
].map((p) => ({ ...p, name: '', question: '', doneWhen: '', updatedAt: now }))
