import type { Challenge } from '../types'

/**
 * 챌린지는 LLM으로 생성하지 않습니다 — 좋은 문항을 미리 써두고 고르기만 하면
 * 되는 일에 매번 모델을 부를 이유가 없습니다. 선택 로직은 lib/challenge.ts에.
 */
export const SEED_CHALLENGES: Challenge[] = [
  /* ── Build vs Buy ─────────────────────────────────── */
  { id: 'bb1', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'Name one thing you are building yourself right now. Does a company sell it? For how much a year? If nobody sells it, why has nobody built it?' },
  { id: 'bb2', cadence: 'weekly', axis: 'Strategy', minutes: 40, prompt: 'Write, in one sentence, why your situation is special enough to build instead of buy. Does that sentence apply just as well to any other company?' },
  { id: 'bb3', cadence: 'weekly', axis: 'Strategy', minutes: 30, prompt: 'Write the three-year maintenance cost of what you are building. Who maintains it? What happens when you leave this team?' },
  { id: 'bb4', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'Is there anything you built this week that would have taken 30 minutes if you had bought it?' },
  { id: 'bb5', cadence: 'weekly', axis: 'Strategy', minutes: 30, prompt: 'One thing you decided to buy six months ago, one thing you decided to build. Deciding again today, which one flips?' },

  /* ── Data integration ─────────────────────────────── */
  { id: 'dt1', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'List every system where HR data currently lives. How many are there? If you lose count partway, that is today’s problem.' },
  { id: 'dt2', cadence: 'weekly', axis: 'Data', minutes: 45, prompt: 'Define "one person". When an applicant becomes an employee and later leaves, does your system know they are the same person?' },
  { id: 'dt3', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Write three questions you want integrated data to answer. How many can you answer today?' },
  { id: 'dt4', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Is there a system you decided NOT to integrate? Why? Does that reason still hold?' },
  { id: 'dt5', cadence: 'weekly', axis: 'Data', minutes: 30, prompt: 'Write the question your intelligence layer answers. What does the person receiving that answer do differently? If nothing changes, it is a report, not intelligence.' },

  /* ── AI features ──────────────────────────────────── */
  { id: 'ai1', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Pick one AI feature you shipped. When it is wrong, who finds out and when? If nobody does, it is not really shipped.' },
  { id: 'ai2', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Find one moment where a recruiter ignored an AI recommendation. Was ignoring it justified?' },
  { id: 'ai3', cadence: 'weekly', axis: 'Data', minutes: 30, prompt: 'Write the metric that tells you an AI feature is working. Is there a path where that metric improves while the experience gets worse?' },
  { id: 'ai4', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Name one thing that made a person trust an AI result. Was it shown reasoning, an undo, or just accuracy?' },
  { id: 'ai5', cadence: 'weekly', axis: 'Domain', minutes: 30, prompt: 'Name one judgment in hiring that AI must never make on our behalf. Write down exactly where you drew that line.' },

  /* ── Building alone ───────────────────────────────── */
  { id: 'so1', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'Is there code you shipped with Claude Code this week that you do not understand? Where?' },
  { id: 'so2', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'If you stopped building this tomorrow, what would remain? If nothing would, you are building too big.' },
  { id: 'so3', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'Did anyone disagree with your judgment this week? If not, is it because you were right or because there was nobody to ask?' },
  { id: 'so4', cadence: 'weekly', axis: 'People', minutes: 30, prompt: 'Write the real cost of having no team. What are you not learning right now?' },
  { id: 'so5', cadence: 'weekly', axis: 'Execution', minutes: 40, prompt: 'Name a system you built that has no documentation. Could anyone else take it over?' },

  /* ── Org and adoption ─────────────────────────────── */
  { id: 'or1', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Name one person blocking company-wide adoption. What are they afraid of losing?' },
  { id: 'or2', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Name a team that does not use what you built. Find one way their current method is better than yours.' },
  { id: 'or3', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'What is one question your manager did not ask you this week but should have?' },
  { id: 'or4', cadence: 'weekly', axis: 'Influence', minutes: 30, prompt: 'Explain your current work to your manager’s manager in three minutes. What do you lead with? If you led with features, write it again.' },
  { id: 'or5', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'Where do candidates wait longest in the hiring process? Is that wait caused by the system or by people?' },

  /* ── Domain depth (2026 goal 1) ───────────────────── */
  { id: 'dm1', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'One term from today’s work that you would not have known six months ago. Define it in three lines, as if explaining to a teammate.' },
  { id: 'dm2', cadence: 'weekly', axis: 'Domain', minutes: 40, prompt: 'List the HR data you are legally not allowed to touch. Name one landmine the feature you are building could step on.' },
  { id: 'dm3', cadence: 'weekly', axis: 'Domain', minutes: 45, prompt: 'Think of three people in Korea who know this space better than you. What do they know that you do not?' },
  { id: 'dm4', cadence: 'weekly', axis: 'Domain', minutes: 40, prompt: 'Spend 30 minutes inside a global Talent product. Find three decisions they made differently from you.' },
  { id: 'dm5', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'One rule that changed in this industry over the past year (regulation, platform policy, common practice). What constraint did it create for your product?' },

  /* ── Leadership principles (2026 goal 3) ──────────── */
  { id: 'lp1', cadence: 'weekly', axis: 'People', minutes: 30, prompt: 'Take one decision from this week and extract a rule: "I ___ when ___." That is a draft principle.' },
  { id: 'lp2', cadence: 'weekly', axis: 'People', minutes: 30, prompt: 'Find a decision this week where a leader you admire would have chosen differently. Is that a difference of principle or of information?' },
  { id: 'lp3', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'Did you postpone a conversation today because it was easier? Does postponing it match your principles?' },
  { id: 'lp4', cadence: 'weekly', axis: 'Influence', minutes: 30, prompt: 'Did you break one of your own principles this week? If breaking it was right, the principle needs rewriting.' },

  /* ── Product sense, general ───────────────────────── */
  { id: 'ps1', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Pick one backlog item and write three lines on what happens if you never build it.' },
  { id: 'ps2', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Copy down, word for word, the most uncomfortable sentence a user said this week. No summarizing.' },
  { id: 'ps3', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'One piece of scope you cut last week. Still the right call?' },
  { id: 'ps4', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Write the success metric for your current feature in one sentence, with a number and a date. If you cannot, write why you cannot.' },
  { id: 'ps5', cadence: 'weekly', axis: 'Product Sense', minutes: 45, prompt: 'Find a feature you built that nobody has used in four weeks. Why?' },

  /* ── Seeds for P4 ─────────────────────────────────── */
  { id: 'ou1', cadence: 'weekly', axis: 'Influence', minutes: 40, prompt: 'Pick one entry from this week that would be useful to someone outside your company. Strip the proper nouns and rewrite it in three paragraphs. Is it an article now?' },
  { id: 'ou2', cadence: 'weekly', axis: 'Influence', minutes: 30, prompt: 'Write one common misconception about "building internal systems alone with AI", then rebut it from your own experience.' },
]
