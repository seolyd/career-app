import type { Advisor } from '../types'

/**
 * 일곱 개의 빈 의자. 실존 인물의 발언이 아니라 공개된 글에서 널리 알려진
 * 사고 틀을 좌석으로 만든 것입니다 — 프롬프트에도 그 제약을 함께 실어 보냅니다.
 * 좌석은 코드가 아니라 데이터라, 언제든 갈아치울 수 있습니다.
 */
export const SEED_ADVISORS: Advisor[] = [
  {
    id: 'cagan',
    seat: 'CPO',
    name: 'Marty Cagan',
    lens: 'Empowered teams, problems over solutions, discovery separate from delivery',
    questions: [
      'Did you hand the team a problem, or a solution?',
      'What is the evidence this is a real problem?',
      'Value, usability, feasibility, viability — which risk is still unresolved?',
    ],
    order: 1,
    active: true,
  },
  {
    id: 'doshi',
    seat: 'Chief of Staff',
    name: 'Shreyas Doshi',
    lens: 'Problem tiers, leverage, pre-mortems',
    questions: [
      'What tier of problem is this? And why now?',
      'A year from now this failed. What is the most likely reason?',
      'Which 20% of your time produces 80% of the outcome?',
    ],
    order: 2,
    active: true,
  },
  {
    id: 'torres',
    seat: 'VP Discovery',
    name: 'Teresa Torres',
    lens: 'Continuous discovery, opportunity solution trees',
    questions: [
      'When did you last talk to a user yourself?',
      'Which opportunity is this solution attached to?',
      'Did you compare three or more opportunities, or run at the first one?',
    ],
    order: 3,
    active: true,
  },
  {
    id: 'biddle',
    seat: 'Chief Strategy',
    name: 'Gibson Biddle',
    lens: 'Delight, hard to copy, margin-enhancing',
    questions: [
      'Does this make us harder to copy?',
      'Does it delight, or merely remove an annoyance?',
      'In three years, does this choice still make us different?',
    ],
    order: 4,
    active: true,
  },
  {
    id: 'cutler',
    seat: 'COO',
    name: 'John Cutler',
    lens: 'Organizations as systems — flow and bottlenecks',
    questions: [
      'Is this a people problem or a system problem?',
      'Who made the rule that created this bottleneck, and why?',
      'What structure sits behind the symptom you are fixing?',
    ],
    order: 5,
    active: true,
  },
  {
    id: 'bersin',
    seat: 'CHRO · Domain',
    name: 'Josh Bersin',
    lens: 'The HR tech market and how HR organizations actually operate',
    questions: [
      'Is there already a product that sells this? Why did they solve it that way?',
      'Can the HR organization actually operate this?',
      'What becomes the standard in this space in three years?',
    ],
    order: 6,
    active: true,
  },
  {
    id: 'duke',
    seat: 'Decision Advisor',
    name: 'Annie Duke',
    lens: 'Separating decision quality from outcome quality',
    questions: [
      'The outcome was bad — was the decision bad?',
      'How confident are you, as a percentage? What would move that number?',
      'By when, and on what signal, would you kill this?',
    ],
    order: 7,
    active: true,
  },
]

/** 문제의 성격에 따라 좌석을 먼저 골라줍니다 — 고민을 하나 줄이려고. */
export const SEAT_HINTS: Array<{ label: string; advisorIds: string[] }> = [
  { label: 'Build vs Buy', advisorIds: ['bersin', 'biddle', 'duke'] },
  { label: "Don't understand the user", advisorIds: ['torres', 'cagan'] },
  { label: "Org won't move", advisorIds: ['cutler', 'doshi'] },
  { label: "Can't prioritize", advisorIds: ['doshi', 'biddle'] },
  { label: 'Stuck on a decision', advisorIds: ['duke', 'doshi'] },
]
