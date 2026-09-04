import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db, newId } from '../db'
import type { Entry, WeekGoal } from '../types'
import { daysLeftInWeek, formatKo, today, weekOf } from '../lib/date'
import { dueToday, oneYearAgo, weakestAxes } from '../lib/stats'
import { pickChallenge } from '../lib/challenge'
import { askClassify, type Draft } from '../lib/ask'
import { Button, Card, SectionTitle, Textarea } from '../components/ui'
import { EntryCard, TypeBadge } from '../components/EntryCard'
import { Header } from '../components/Header'
import { InstallBanner } from '../components/InstallBanner'
import { AskButton, AskSheet } from '../components/AskSheet'

interface ClassifySuggestion {
  type?: string
  axis?: string
  title?: string
  body?: string
  tags?: string[]
  predictionHint?: string
}

export function Today() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [ask, setAsk] = useState<Draft | null>(null)
  const [saved, setSaved] = useState(false)
  const iso = today()

  const entries = useLiveQuery(() => db.entries.orderBy('occurredAt').reverse().toArray(), []) ?? []
  const logs = useLiveQuery(() => db.challengeLogs.toArray(), []) ?? []
  const weekGoals = useLiveQuery(() => db.weekGoals.where('weekOf').equals(weekOf()).toArray(), []) ?? []
  const yearGoals = useLiveQuery(() => db.yearGoals.toArray(), []) ?? []

  const recent30 = entries.filter((e) => e.occurredAt >= isoDaysAgo(30))
  const weak = weakestAxes(recent30)
  const daily = pickChallenge('daily', weak, logs, iso)
  const due = dueToday(entries, iso)
  const lastYear = oneYearAgo(entries, iso)
  const goalTitle = (id: string) => yearGoals.find((g) => g.id === id)?.title ?? ''

  async function quickSave(text: string, extra?: Partial<Entry>) {
    const clean = text.trim()
    if (!clean) return null
    const [first, ...rest] = clean.split('\n')
    const now = Date.now()
    const id = newId()
    await db.entries.add({
      id,
      type: 'Reflection',
      title: first.slice(0, 80),
      body: rest.join('\n').trim(),
      axis: 'Execution',
      tags: [],
      occurredAt: iso,
      createdAt: now,
      updatedAt: now,
      ...extra,
    })
    return id
  }

  return (
    <>
      <Header
        title="Today"
        action={
          <Link to="/settings" aria-label="Settings" className="p-1 text-slate-400 dark:text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.3-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </Link>
        }
      />

      <InstallBanner />

      <div className="space-y-6 p-4">
        {/* 1. 이번 주 목표 — 플래너에서 내려옵니다 */}
        <section>
          <SectionTitle
            action={
              <Link to="/plan" className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
                Plan
              </Link>
            }
          >
            This week's goals · {daysLeftInWeek()} days left
          </SectionTitle>
          {weekGoals.length ? (
            <Card className="space-y-3 p-4">
              {weekGoals.map((g) => (
                <WeekGoalRow key={g.id} goal={g} goalTitle={goalTitle(g.yearGoalId)} />
              ))}
            </Card>
          ) : (
            <Card>
              <p className="text-[14px] text-slate-500 dark:text-slate-400">
                No goals this week. A week without goals just accumulates entries.
              </p>
              <Button variant="primary" className="mt-3 w-full" onClick={() => navigate('/plan')}>
                Set this week’s goals
              </Button>
            </Card>
          )}
        </section>

        {/* 2. 돌아볼 것 — 있을 때만 */}
        {(due.length > 0 || lastYear) && (
          <section>
            <SectionTitle>Come back to this</SectionTitle>
            <div className="space-y-2">
              {due.map((e) => (
                <Link
                  key={e.id}
                  to={`/entry/${e.id}?review=1`}
                  className="block rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40"
                >
                  <div className="flex items-center gap-2">
                    <TypeBadge type={e.type} />
                    <span className="text-[12px] font-medium text-amber-800 dark:text-amber-500">
                      Review due {formatKo(e.reviewDate!)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-semibold">{e.title}</h3>
                  <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-300">
                    You predicted: {e.prediction || '(not recorded)'}
                  </p>
                  <p className="mt-2 text-[13px] font-medium text-amber-800 dark:text-amber-500">
                    What actually happened? →
                  </p>
                </Link>
              ))}
              {lastYear && (
                <div>
                  <p className="mb-1.5 text-[12px] text-slate-400 dark:text-slate-500">One year ago today</p>
                  <EntryCard entry={lastYear} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3. 오늘의 훈련 */}
        {daily && (
          <section>
            <SectionTitle>Today's drill · {daily.minutes} min</SectionTitle>
            <Card>
              <p className="text-[15px] leading-7">{daily.prompt}</p>
              <Button
                variant="primary"
                className="mt-3 w-full"
                onClick={() =>
                  navigate(
                    `/entry/new?axis=${encodeURIComponent(daily.axis)}&title=${encodeURIComponent(
                      daily.prompt.slice(0, 60),
                    )}&challenge=${daily.id}`,
                  )
                }
              >
                Write your answer
              </Button>
            </Card>
          </section>
        )}

        {/* 4. 오늘의 글 — RSS는 배포 후 붙습니다 */}
        <section>
          <SectionTitle
            action={
              <Link to="/reading" className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
                Reading
              </Link>
            }
          >
            Today's read
          </SectionTitle>
          <Card>
            <p className="text-[14px] text-slate-500 dark:text-slate-400">
              The guru and AI-media feeds fill themselves every morning once this is deployed. Until then, add links yourself from the Reading tab.
            </p>
          </Card>
        </section>

        {/* 5. 한 줄 기록 */}
        <section>
          <SectionTitle>One-line entry</SectionTitle>
          <Card>
            <Textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="One line on what just happened. You can classify it later."
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                className="flex-1"
                disabled={!draft.trim()}
                onClick={async () => {
                  await quickSave(draft)
                  setDraft('')
                  setSaved(true)
                  setTimeout(() => setSaved(false), 1800)
                }}
              >
                {saved ? 'Saved' : 'Just save'}
              </Button>
              <AskButton
                label="Let the LLM classify"
                onClick={() => draft.trim() && setAsk(askClassify(draft))}
              />
            </div>
            <p className="mt-2 text-[12px] text-slate-400 dark:text-slate-500">
              Classifying fills in type, axis and title for you. In a hurry, just save and fix it later.
            </p>
          </Card>
        </section>
      </div>

      <AskSheet
        draft={ask}
        onClose={() => setAsk(null)}
        onResult={async (_reply, parsed) => {
          const s = (parsed ?? {}) as ClassifySuggestion
          const id = await quickSave(draft, {
            type: (s.type as Entry['type']) ?? 'Reflection',
            axis: (s.axis as Entry['axis']) ?? 'Execution',
            title: s.title?.slice(0, 80) ?? draft.trim().split('\n')[0].slice(0, 80),
            body: s.body ?? draft.trim(),
            tags: Array.isArray(s.tags) ? s.tags.slice(0, 5) : [],
            prediction: s.predictionHint,
          })
          setDraft('')
          if (id) navigate(`/entry/${id}`)
        }}
      />
    </>
  )
}

function WeekGoalRow({ goal, goalTitle }: { goal: WeekGoal; goalTitle: string }) {
  const done = goal.status === 'Done'
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        aria-label={done ? 'Mark not done' : 'Mark done'}
        onClick={() =>
          void db.weekGoals.update(goal.id, {
            status: done ? 'Open' : 'Done',
            judgedAt: done ? undefined : Date.now(),
          })
        }
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
          done
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {done && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M5 12l5 5L19 7" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] ${done ? 'text-slate-400 line-through dark:text-slate-600' : ''}`}>
          {goal.title}
        </p>
        {goalTitle && (
          <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">{goalTitle}</p>
        )}
      </div>
    </div>
  )
}

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
