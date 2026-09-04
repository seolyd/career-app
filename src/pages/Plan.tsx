import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '../db'
import type { WeekGoal } from '../types'
import {
  daysLeftInWeek,
  formatRange,
  isoFromTs,
  planProgress,
  quarterLabel,
  quarterRange,
  rangeOfWeek,
  relativeKo,
  weekOf,
} from '../lib/date'
import { axisCounts } from '../lib/stats'
import { askBreakdown, askGap, askNarrative, askWeekly, type Draft } from '../lib/ask'
import { Button, Card, Chip, Empty, Input, Label, SectionTitle, Textarea } from '../components/ui'
import { Header } from '../components/Header'
import { AskButton, AskSheet } from '../components/AskSheet'

const CRITERIA_KEY = 'career-app:level-criteria'

interface BreakdownReply {
  weekGoals?: string[]
}

export function Plan() {
  const [ask, setAsk] = useState<Draft | null>(null)
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [newWeekGoal, setNewWeekGoal] = useState('')
  const [criteria, setCriteria] = useState(() => localStorage.getItem(CRITERIA_KEY) ?? '')
  const [editVision, setEditVision] = useState(false)

  const monday = weekOf()
  const vision = useLiveQuery(() => db.vision.get('vision'), [])
  const phases = useLiveQuery(() => db.phases.orderBy('order').toArray(), []) ?? []
  const yearGoals = useLiveQuery(() => db.yearGoals.toArray(), []) ?? []
  const weekGoals = useLiveQuery(() => db.weekGoals.where('weekOf').equals(monday).toArray(), [monday]) ?? []
  const entries = useLiveQuery(() => db.entries.orderBy('occurredAt').reverse().toArray(), []) ?? []
  const sessions = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().limit(5).toArray(), []) ?? []

  const thisYear = new Date().getFullYear()
  const currentGoals = yearGoals.filter((g) => g.year === thisYear)
  const [wkFrom, wkTo] = rangeOfWeek(monday)
  const weekEntries = entries.filter((e) => e.occurredAt >= wkFrom && e.occurredAt <= wkTo)
  const [qFrom, qTo] = quarterRange()
  const quarterEntries = entries.filter((e) => e.occurredAt >= qFrom && e.occurredAt <= qTo)
  const pendingActions = sessions.flatMap((s) => s.actionItems.map((it) => ({ text: it, sessionId: s.id })))

  const goalTitle = (id: string) => yearGoals.find((g) => g.id === id)?.title ?? ''

  async function addWeekGoal(yearGoalId: string, title: string) {
    if (!title.trim()) return
    await db.weekGoals.add({
      id: newId(),
      yearGoalId,
      weekOf: monday,
      title: title.trim(),
      status: 'Open',
      createdAt: Date.now(),
    })
  }

  return (
    <>
      <Header title="Plan" />

      <div className="space-y-6 p-4">
        {/* 비전 */}
        <section>
          <SectionTitle
            action={
              <button
                type="button"
                onClick={() => setEditVision((v) => !v)}
                className="text-[13px] font-medium text-blue-600 dark:text-blue-400"
              >
                {editVision ? 'Done' : 'Edit'}
              </button>
            }
          >
            10-year vision
          </SectionTitle>
          <Card>
            {editVision ? (
              <div className="space-y-3">
                <Textarea
                  rows={3}
                  value={vision?.text ?? ''}
                  onChange={(e) => void db.vision.put({ id: 'vision', text: e.target.value, why: vision?.why ?? '', updatedAt: Date.now() })}
                  placeholder="Where you want to stand in ten years — one sentence"
                />
                <Textarea
                  rows={2}
                  value={vision?.why ?? ''}
                  onChange={(e) => void db.vision.put({ id: 'vision', text: vision?.text ?? '', why: e.target.value, updatedAt: Date.now() })}
                  placeholder="Why"
                />
              </div>
            ) : (
              <>
                <p className="text-[16px] leading-7 font-medium">{vision?.text || '(not written yet)'}</p>
                {vision?.why && <p className="mt-2 text-[14px] leading-6 text-slate-500 dark:text-slate-400">{vision.why}</p>}
                {vision && (
                  <p className="mt-2 text-[12px] text-slate-400 dark:text-slate-500">
                    Last edited {relativeKo(isoFromTs(vision.updatedAt))}
                  </p>
                )}
              </>
            )}
          </Card>
        </section>

        {/* 페이즈 */}
        <section>
          <SectionTitle>Phases</SectionTitle>
          <div className="space-y-2">
            {phases.map((p) => {
              const pct = planProgress(p.startYear, p.endYear)
              const active = pct > 0 && pct < 1
              return (
                <Card key={p.id} className={active ? 'border-blue-400 dark:border-blue-700' : undefined}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold tracking-wide text-blue-600 dark:text-blue-400">
                      P{p.order}
                    </span>
                    <span className="font-semibold">{p.name}</span>
                    <span className="ml-auto text-[12px] tabular-nums text-slate-400 dark:text-slate-500">
                      {p.startYear}–{p.endYear}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] text-slate-600 dark:text-slate-300">{p.question}</p>
                  <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Done when: {p.doneWhen}</p>
                  {active && (
                    <div className="mt-2.5">
                      <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span className="block h-full rounded-full bg-blue-600 dark:bg-blue-400" style={{ width: `${pct * 100}%` }} />
                      </span>
                      <p className="mt-1 text-[12px] tabular-nums text-slate-400 dark:text-slate-500">
                        {Math.round(pct * 100)}% through this phase
                      </p>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </section>

        {/* 이번 주 */}
        <section>
          <SectionTitle>This week · {formatRange([wkFrom, wkTo])} · {daysLeftInWeek()} days left</SectionTitle>
          {weekGoals.length > 0 && (
            <Card className="mb-2 space-y-3">
              {weekGoals.map((g) => (
                <WeekRow key={g.id} goal={g} goalTitle={goalTitle(g.yearGoalId)} />
              ))}
            </Card>
          )}

          {/* 말한 것 vs 한 것 — 이 기둥의 핵심 */}
          <Card>
            <h3 className="text-[15px] font-bold">Declared vs done</h3>
            <div className="mt-2 flex gap-4">
              <div className="flex-1">
                <div className="text-2xl font-bold tabular-nums">{weekGoals.filter((g) => g.status === 'Done').length}/{weekGoals.length}</div>
                <div className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">Declared</div>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold tabular-nums">{weekEntries.length}</div>
                <div className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">Entries</div>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold tabular-nums">
                  {weekEntries.filter((e) => !e.yearGoalId).length}
                </div>
                <div className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">Off-goal</div>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-slate-500 dark:text-slate-400">
              If all your time went to things that were not on the list, that is the real signal this week. When the gap keeps leaning the same way, the goal is wrong — not you.
            </p>
            <AskButton
              className="mt-3"
              label="Get weekly coaching"
              onClick={() =>
                setAsk(
                  askWeekly(
                    [wkFrom, wkTo],
                    weekEntries,
                    weekGoals.map((g) => ({ ...g, goalTitle: goalTitle(g.yearGoalId) })),
                    axisCounts(weekEntries).filter(([, n]) => n > 0),
                  ),
                )
              }
            />
          </Card>
        </section>

        {/* 보드에서 온 실행 항목 */}
        {pendingActions.length > 0 && (
          <section>
            <SectionTitle>Action items from the Board</SectionTitle>
            <Card className="space-y-2.5">
              {pendingActions.slice(0, 6).map((a) => (
                <div key={`${a.sessionId}-${a.text}`} className="flex items-start gap-2">
                  <p className="flex-1 text-[14px] leading-6">{a.text}</p>
                  {currentGoals[0] && (
                    <button
                      type="button"
                      onClick={() => void addWeekGoal(currentGoals[0].id, a.text)}
                      className="shrink-0 text-[13px] font-medium text-blue-600 dark:text-blue-400"
                    >
                      To this week
                    </button>
                  )}
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* 연 목표 */}
        <section>
          <SectionTitle>{thisYear} goals</SectionTitle>
          {currentGoals.length ? (
            <div className="space-y-2">
              {currentGoals.map((g) => {
                const mine = entries.filter((e) => e.yearGoalId === g.id)
                const wk = weekGoals.filter((w) => w.yearGoalId === g.id)
                return (
                  <Card key={g.id}>
                    <div className="flex items-start gap-2">
                      <h3 className="flex-1 font-semibold">{g.title}</h3>
                      <Chip
                        active={g.status === 'Done'}
                        onClick={() =>
                          void db.yearGoals.update(g.id, {
                            status: g.status === 'Done' ? 'Active' : 'Done',
                            updatedAt: Date.now(),
                          })
                        }
                      >
                        {g.status}
                      </Chip>
                    </div>
                    <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                      Done when: {g.doneWhen || '(not written)'}
                    </p>
                    <p className="mt-2 text-[12px] text-slate-400 dark:text-slate-500">
                      {mine.length} entries linked · {wk.length} goals this week
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAddingFor(addingFor === g.id ? null : g.id)}
                        className="text-[13px] font-medium text-blue-600 dark:text-blue-400"
                      >
                        Add a weekly goal
                      </button>
                      <AskButton
                        label="Let the LLM break it down"
                        onClick={() => setAsk(askBreakdown(g, entries.slice(0, 15)))}
                      />
                    </div>

                    {addingFor === g.id && (
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={newWeekGoal}
                          onChange={(e) => setNewWeekGoal(e.target.value)}
                          placeholder="Something you can finish this week"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              await addWeekGoal(g.id, newWeekGoal)
                              setNewWeekGoal('')
                            }
                          }}
                        />
                        <Button
                          variant="primary"
                          onClick={async () => {
                            await addWeekGoal(g.id, newWeekGoal)
                            setNewWeekGoal('')
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <Empty title={`No goals set for ${thisYear}`} />
            </Card>
          )}
        </section>

        {/* 승진 역량 갭 — 2026 연 목표 2 */}
        <section>
          <SectionTitle>Promotion gap</SectionTitle>
          <Card>
            <Label>What the next level expects (write it yourself)</Label>
            <Textarea
              rows={4}
              value={criteria}
              onChange={(e) => {
                setCriteria(e.target.value)
                localStorage.setItem(CRITERIA_KEY, e.target.value)
              }}
              placeholder="List what L6-2 expects. Paste the company rubric, or write what your manager told you."
            />
            <p className="mt-2 text-[13px] leading-6 text-slate-500 dark:text-slate-400">
              Each item gets judged against evidence in your entries. For evidence you cannot produce without a team, you get substitutes.
            </p>
            <AskButton
              className="mt-3"
              label="Diagnose the gap"
              onClick={() =>
                setAsk(askGap(criteria, entries.slice(0, 40), axisCounts(entries).filter(([, n]) => n > 0)))
              }
            />
          </Card>
        </section>

        {/* 분기 서사 */}
        <section>
          <SectionTitle>Career narrative</SectionTitle>
          <Card>
            <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">
              {quarterEntries.length} entries from {quarterLabel()}, grouped by goal. The prompt carries a constraint against inventing anything your entries do not show.
            </p>
            <AskButton
              className="mt-3"
              label="Draft STAR and résumé bullets"
              onClick={() => setAsk(askNarrative(quarterEntries, currentGoals, quarterLabel()))}
            />
          </Card>
        </section>
      </div>

      <AskSheet
        draft={ask}
        onClose={() => setAsk(null)}
        onResult={async (_reply, parsed, record) => {
          const items = (parsed as BreakdownReply)?.weekGoals
          if (record.kind === 'breakdown' && Array.isArray(items) && record.originId) {
            for (const title of items.filter((s) => typeof s === 'string').slice(0, 3)) {
              await addWeekGoal(record.originId, title)
            }
          }
        }}
      />
    </>
  )
}

function WeekRow({ goal, goalTitle }: { goal: WeekGoal; goalTitle: string }) {
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
          done ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {done && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M5 12l5 5L19 7" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] ${done ? 'text-slate-400 line-through dark:text-slate-600' : ''}`}>{goal.title}</p>
        {goalTitle && <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">{goalTitle}</p>}
      </div>
      <button
        type="button"
        aria-label="Delete"
        onClick={() => void db.weekGoals.delete(goal.id)}
        className="shrink-0 p-1 text-slate-300 dark:text-slate-600"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}
