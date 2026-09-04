import type { Advisor, Ask, AskKind, Entry, WeekGoal, YearGoal } from '../types'
import { formatKo, formatRange } from './date'

/**
 * 하이브리드 LLM의 규칙 하나: **조립은 스크립트가, 판단은 LLM이.**
 * 여기 있는 함수들은 전부 순수 함수이고, 컨텍스트를 모아 프롬프트 문자열을 만들 뿐입니다.
 * 집계·정렬·통계·선택처럼 코드로 정확히 되는 일에는 모델을 부르지 않습니다.
 */

const ME = `I am a product manager at Coupang, responsible for HR products — the recruiting and people
platforms and the AI features built on top of them. I have no team and no engineers; I write the code
myself. There is one manager above me. I am currently building and internalizing company-wide systems
with AI. Three questions occupy me: what to build versus what to buy, how to unify scattered internal
tools into a single data model, and how to turn that data into intelligence that raises productivity.
I started as a PM, spent five years in recruiting, and came back to product.`

const BREVITY = `Answer tersely. No praise, no preamble, no restating my question. Go straight to the substance.`

const JSON_TAIL = (shape: string) =>
  `\n\nEnd your answer with exactly one \`\`\`json code block in this shape. The app reads only that block.\n\`\`\`json\n${shape}\n\`\`\``

/* ── 치환 ─────────────────────────────────────────────── */

const REDACT_KEY = 'career-app:redactions'

export interface Redaction {
  from: string
  to: string
}

export function loadRedactions(): Redaction[] {
  try {
    const raw = localStorage.getItem(REDACT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Redaction[]).filter((r) => r?.from) : []
  } catch {
    return []
  }
}

export function saveRedactions(list: Redaction[]): void {
  try {
    localStorage.setItem(REDACT_KEY, JSON.stringify(list))
  } catch {
    /* 저장소가 막힌 브라우저에서는 이번 세션만 적용됩니다 */
  }
}

/** 밖으로 나가기 직전에 고유명사를 갈아끼웁니다. */
export function redact(text: string, list = loadRedactions()): string {
  return list.reduce(
    (acc, r) => (r.from ? acc.split(r.from).join(r.to || '○○') : acc),
    text,
  )
}

/* ── 답 파싱 ──────────────────────────────────────────── */

/** 답 안의 ```json 블록을 꺼냅니다. 없으면 undefined — 그래도 원문은 그대로 남습니다. */
export function extractJSON(reply: string): unknown {
  const fenced = reply.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] ?? reply.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)?.[1]
  if (!candidate) return undefined
  try {
    return JSON.parse(candidate.trim())
  } catch {
    return undefined
  }
}

/* ── 프롬프트 조립기 ──────────────────────────────────── */

export interface Draft {
  kind: AskKind
  title: string
  prompt: string
  originType?: Ask['originType']
  originId?: string
}

const entryLine = (e: Entry) =>
  `- [${e.type}/${e.axis}] ${formatKo(e.occurredAt)} · ${e.title || '(untitled)'}${
    e.body.trim() ? `\n    ${e.body.trim().replace(/\n+/g, ' ').slice(0, 300)}` : ''
  }`

/** 한 줄 기록에 타입·축·제목을 붙입니다. 하루에 여러 번 쓰는 가장 가벼운 왕복. */
export function askClassify(text: string): Draft {
  return {
    kind: 'classify',
    title: 'Classify this note',
    prompt: `${ME}

Below is a note I just jotted down. Turn it into a journal entry in my format.

Note:
"""
${text}
"""

Type is one of: Decision / Ship / Signal / People / Reflection / Input
Axis is one of: Product Sense / Execution / Strategy / Data / Influence / People / Domain

Make the title specific enough that I can find it later when writing a résumé. If there is a number, put it in the title.
Clean up the body, but invent nothing that is not in my note.
If the type is Decision, also suggest in one line what I should be predicting.
${BREVITY}${JSON_TAIL(`{
  "type": "Decision",
  "axis": "Strategy",
  "title": "...",
  "body": "...",
  "tags": ["..."],
  "predictionHint": "..."
}`)}`,
  }
}

/** 보드 자문 — 좌석의 렌즈를 빌려 문제를 다시 봅니다. */
export function askBoard(
  problem: string,
  advisors: Advisor[],
  selfAnswers: Record<string, string>,
  originId?: string,
): Draft {
  const seats = advisors
    .map((a) => {
      const answered = a.questions
        .map((q, i) => {
          const mine = selfAnswers[`${a.id}:${i}`]?.trim()
          return mine ? `  - ${q}\n    (my answer) ${mine}` : `  - ${q}\n    (my answer) not written yet`
        })
        .join('\n')
      return `## ${a.name} — ${a.seat}\nLens: ${a.lens}\nQuestions from this lens, and my answers:\n${answered}`
    })
    .join('\n\n')

  return {
    kind: 'board',
    title: `Board — ${advisors.map((a) => a.name).join(', ')}`,
    originType: 'session',
    originId,
    prompt: `${ME}

I use the publicly known thinking frames of the people below as seats on my personal advisory board.
**Important: do not invent things they said. Do not quote them.**
Borrow only the known perspective and style of questioning, and use that angle to show me what I am missing.

# My problem
${problem}

# Seats and lenses
${seats}

For each seat, give me (1) the weakest point in my answer and (2) one further question that lens would ask.
At the end, point out where the seats disagree with each other. The conflicts are the most useful part.
${BREVITY}${JSON_TAIL(`{ "actionItems": ["1-3 concrete actions I can take this week"] }`)}`,
  }
}

/** 주간 코칭 — 일요일 판정 직후. */
export function askWeekly(
  range: [string, string],
  entries: Entry[],
  weekGoals: Array<WeekGoal & { goalTitle: string }>,
  axisCounts: Array<[string, number]>,
): Draft {
  const declared = weekGoals.length
    ? weekGoals.map((g) => `- [${g.status}] ${g.title}  (year goal: ${g.goalTitle})`).join('\n')
    : '- (no goals set this week)'
  const done = entries.length ? entries.map(entryLine).join('\n') : '- (no entries)'
  const dist = axisCounts.map(([a, n]) => `${a} ${n}`).join(' · ')

  return {
    kind: 'weekly',
    title: `Weekly coaching — ${formatRange(range)}`,
    originType: 'week',
    originId: range[0],
    prompt: `${ME}

# This week (${formatRange(range)})

## What I declared I would do
${declared}

## What actually shows up in my entries
${done}

## Axis distribution
${dist || '(none)'}

You are a senior PM coach who has watched me for a long time. I have no team, so nobody pushes back on
me day to day. Take that seat. I do not need encouragement.

1. **The gap between declared and actual** — if I spent time on things that were not on my list, what does that signal? Am I undisciplined, or was the goal wrong?
2. **Repeating patterns** — any behavior or avoidance that carries over from previous weeks?
3. **What I am avoiding** — what kind of work is missing from these entries that should be there?
4. **One experiment for next week** — exactly one, and it must show a result within the week.
${BREVITY}${JSON_TAIL(`{ "actionItems": ["1-3 items worth promoting to next week's goals"] }`)}`,
  }
}

/** 결정 부검 — 예측과 실제를 나란히 놓고 편향을 찾습니다. */
export function askAutopsy(reviewed: Entry[]): Draft {
  const rows = reviewed
    .map(
      (e) => `## ${e.title}
- Date: ${formatKo(e.occurredAt)} · Axis: ${e.axis}
- Decision: ${e.body.trim().slice(0, 400) || '(no body)'}
- Alternatives dropped: ${e.alternatives || '(not recorded)'}
- Prediction at the time: ${e.prediction || '(not recorded)'}
- What I said would prove me wrong: ${e.failCondition || '(not recorded)'}
- What actually happened: ${e.result || '(not recorded)'}
- Verdict: ${e.verdict ?? 'unreviewed'}
- What I said I missed: ${e.missed || '(not recorded)'}`,
    )
    .join('\n\n')

  return {
    kind: 'autopsy',
    title: `Decision autopsy — ${reviewed.length} decisions`,
    prompt: `${ME}

Below are decisions I made, the predictions I wrote at the time, and what actually happened.

${rows}

Read these the way Annie Duke would — **separating decision quality from outcome quality.**
Split the ones that were right by luck from the ones that were right by judgment, and do the same in reverse.

1. Do my predictions miss **repeatedly in the same direction**? (e.g. underestimating org resistance, underestimating maintenance cost)
2. Does the bias differ between build decisions and buy decisions?
3. Give me a concrete way to correct for it — one checklist line I can use on the next decision.
${BREVITY}${JSON_TAIL(`{ "biases": ["name of bias and one-line description"], "checklist": ["question to ask on the next decision"] }`)}`,
  }
}

/** 읽은 글 한 편 → 요약과 "그래서 나는". 매일 한 번 도는 가벼운 왕복. */
export function askDigest(title: string, url: string, note: string): Draft {
  return {
    kind: 'digest',
    title: `Digest — ${title}`,
    prompt: `${ME}

I read the following piece.

Title: ${title}
Link: ${url}
${note.trim() ? `My note after reading:\n"""\n${note.trim()}\n"""` : '(I have not written a note yet)'}

After opening it:
1. Summarize the core argument in three lines.
2. Separate what **applies** to my situation (a PM building internal HR systems alone) from what **does not**.
3. Propose one sentence of the form "So I will ___" — something I can actually do this week.

If you cannot access the link, say so and do step 3 from my note alone. Do not guess at the contents.
${BREVITY}${JSON_TAIL(`{ "summary": "three-line summary", "soWhat": "So I will ..." }`)}`,
  }
}

/** 연 목표를 이번 주에 손댈 수 있는 크기로 쪼갭니다. */
export function askBreakdown(goal: YearGoal, recent: Entry[]): Draft {
  return {
    kind: 'breakdown',
    title: `Break down — ${goal.title}`,
    originType: 'yearGoal',
    originId: goal.id,
    prompt: `${ME}

# This year's goal
${goal.title}
Done when: ${goal.doneWhen || '(not written)'}

# My recent entries
${recent.length ? recent.map(entryLine).join('\n') : '(no recent entries)'}

Propose three pieces of work **sized to finish this week** that move this goal forward.
Constraints: each must fit in three hours, each must leave an artifact behind
("think about X" does not count), and none may duplicate work I am already doing.
${BREVITY}${JSON_TAIL(`{ "weekGoals": ["...", "...", "..."] }`)}`,
  }
}

/** 리더십 원칙은 선언이 아니라 내가 내린 결정에서 추출하는 것입니다. (2026 목표 3) */
export function askPrinciples(decisions: Entry[], people: Entry[]): Draft {
  return {
    kind: 'principles',
    title: 'Extract principles from my decisions',
    prompt: `${ME}

One of my goals this year is to **establish leadership principles.**
But I do not want to invent them in my head. I want them extracted from decisions I actually made.

# Decisions I made
${decisions.length ? decisions.map(entryLine).join('\n') : '(none)'}

# Entries about people and organization
${people.length ? people.map(entryLine).join('\n') : '(none)'}

1. Find rules I am **already following consistently** in these entries. Phrase each as "I ___ when ___." Three to five of them.
2. Point to the entries that back each principle. If a principle rests on only one entry, tell me it is a coincidence, not a principle.
3. Show me where my entries **contradict each other**. Those are the principles I have not settled yet.
4. Name the areas where my position (no team, HR domain, AI internalization) will soon demand a principle I show no trace of yet.

Invent nothing. If the evidence is thin, say it is thin.
${BREVITY}${JSON_TAIL(`{ "principles": [{ "text": "I ... when ...", "evidence": ["entry title"] }], "contradictions": ["..."] }`)}`,
  }
}

/** L6-1 → L6-2 역량 갭 진단. (2026 목표 2) */
export function askGap(criteria: string, entries: Entry[], axisCounts: Array<[string, number]>): Draft {
  return {
    kind: 'gap',
    title: 'Promotion gap diagnosis',
    prompt: `${ME}

I am currently L6-1 and working toward L6-2.

# What I understand the next level to expect
${criteria.trim() || '(I have not written this down. Use the general senior PM to lead PM transition as the bar.)'}

# My recent entries
${entries.length ? entries.map(entryLine).join('\n') : '(none)'}

# Axis distribution
${axisCounts.map(([a, n]) => `${a} ${n}`).join(' · ') || '(none)'}

1. For each expectation, judge whether my entries contain **evidence** — strong / thin / none.
2. Where evidence is missing, separate a real capability gap from a lack of opportunity.
   (I have no direct reports, so evidence of leading people is structurally hard for me to produce.)
3. For the ones blocked by opportunity, propose **substitute evidence I can create from where I sit.**
4. If I had to prioritize for the rest of the year, which two?

Do not credit me with achievements my entries do not show. Thin is a more useful answer than generous.
${BREVITY}${JSON_TAIL(`{ "gaps": [{ "area": "...", "evidence": "strong|thin|none", "action": "..." }], "top2": ["...", "..."] }`)}`,
  }
}

/** 분기·연말 서사. 기록 골격은 스크립트가 묶고, 문장화만 맡깁니다. */
export function askNarrative(entries: Entry[], goals: YearGoal[], label: string): Draft {
  const byGoal = goals
    .map((g) => {
      const mine = entries.filter((e) => e.yearGoalId === g.id)
      return `## ${g.title}\n${mine.length ? mine.map(entryLine).join('\n') : '- (no entries linked)'}`
    })
    .join('\n\n')
  const loose = entries.filter((e) => !e.yearGoalId)

  return {
    kind: 'narrative',
    title: `Career narrative — ${label}`,
    prompt: `${ME}

# ${label} entries, grouped by goal
${byGoal}

## Entries not linked to any goal
${loose.length ? loose.map(entryLine).join('\n') : '- (none)'}

1. For each goal, write the outcome in **STAR** form (situation, task, action, result). Use any number that appears in the entries; where there is none, write "no number".
2. Pull out eight résumé bullets. Each starts with a verb and contains a result.
3. At the end, tell me **what these entries cannot yet support me claiming.** What do I need to record next quarter for this narrative to hold together?

Do not manufacture achievements or numbers that are not in the entries. That is the whole reason I use this tool.
${BREVITY}`,
  }
}

/** Build vs Buy — 결정을 확정하기 전에 반대편을 강하게 만듭니다. */
export function askBuildBuy(entry: Entry): Draft {
  const bb = entry.buildBuy
  return {
    kind: 'buildbuy',
    title: `Build vs Buy counter-case — ${entry.title}`,
    originType: 'entry',
    originId: entry.id,
    prompt: `${ME}

I have a decision I have not committed to yet. Build the **strongest possible case against my conclusion.**

# The decision
${entry.title}
${entry.body.trim()}

# The form I filled in
- Who sells this, and for how much: ${bb?.market || '(not filled)'}
- Why we are different: ${bb?.specialness || '(not filled)'}
- Who maintains it in 3 years: ${bb?.upkeep || '(not filled)'}
- What buying costs us: ${bb?.costOfBuying || '(not filled)'}
- Cost to reverse: ${bb?.reversalCost || '(not filled)'}

Push hard on these in particular.
1. Is my "we are different" sentence one that would apply just as well to any other company?
2. AI made **building** cheaper. It did not make **maintaining** cheaper. Draw the three-year picture concretely.
3. Does the conclusion change if I assume I have left this team?
4. Conversely, if I chose to buy, where would I regret it most?

Do not take my side. If I have missed nothing, you may say so.
${BREVITY}`,
  }
}
