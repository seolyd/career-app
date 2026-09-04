import type { Phase, Vision, YearGoal } from '../types'

const now = Date.now()

export const SEED_VISION: Vision = {
  id: 'vision',
  text: 'Product Thought Leadership — people think about product through frames I built',
  why: 'Starting from Talent products, what finally remains is not the features I shipped but the way of thinking I left behind.',
  updatedAt: now,
}

/**
 * 10년을 균등하게 4등분하지 않습니다. 가까울수록 해상도가 높으니
 * 앞이 짧고 뒤가 깁니다 (2·2·3·3년).
 */
export const SEED_PHASES: Phase[] = [
  {
    id: 'p1',
    order: 1,
    name: 'Talent Product Expert',
    question: 'Is my judgment in this domain backed by evidence?',
    doneWhen: 'When people in Korea name me as who to ask about this space, and at least one system runs without me touching it',
    startYear: 2026,
    endYear: 2027,
    updatedAt: now,
  },
  {
    id: 'p2',
    order: 2,
    name: 'Product Leader',
    question: 'Can the way I work alone be handed to someone else?',
    doneWhen: 'When someone I hired starts pushing back on my judgment',
    startYear: 2028,
    endYear: 2029,
    updatedAt: now,
  },
  {
    id: 'p3',
    order: 3,
    name: 'Cited Outside',
    question: 'Is my thinking useful outside this company?',
    doneWhen: 'When someone applies a frame I wrote to a problem of their own',
    startYear: 2030,
    endYear: 2032,
    updatedAt: now,
  },
  {
    id: 'p4',
    order: 4,
    name: 'Product Thought Leadership',
    question: 'Has my frame become someone else\'s default?',
    doneWhen: '(rewrite this near the end of P1)',
    startYear: 2033,
    endYear: 2035,
    updatedAt: now,
  },
]

export const SEED_YEAR_GOALS: YearGoal[] = [
  {
    id: 'y2026-1',
    phaseId: 'p1',
    year: 2026,
    title: 'Become a top-tier Talent Product expert in Korea',
    doneWhen: 'When people outside the company reach out to ask about problems in this space',
    status: 'Active',
    updatedAt: now,
  },
  {
    id: 'y2026-2',
    phaseId: 'p1',
    year: 2026,
    title: 'Close the capability gap for L6-2',
    doneWhen: 'When every gap I named carries at least three entries as evidence',
    status: 'Active',
    updatedAt: now,
  },
  {
    id: 'y2026-3',
    phaseId: 'p1',
    year: 2026,
    title: 'Establish leadership principles',
    doneWhen: 'When principles are extracted from decisions I actually made, and later decisions get checked against them',
    status: 'Active',
    updatedAt: now,
  },
]
