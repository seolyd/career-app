import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { ENTRY_TYPES, type Axis, type EntryType } from '../types'
import { today } from '../lib/date'
import { axisCounts, calibration } from '../lib/stats'
import { askAutopsy, askPrinciples, type Draft } from '../lib/ask'
import { useAllTags } from '../lib/hooks'
import { Card, Chip, Empty, Input, SectionTitle } from '../components/ui'
import { AXIS_COLOR, EntryCard } from '../components/EntryCard'
import { Header } from '../components/Header'
import { AskButton, AskSheet } from '../components/AskSheet'

const AXIS_BAR: Record<Axis, string> = {
  'Product Sense': 'bg-teal-600 dark:bg-teal-400',
  Execution: 'bg-blue-600 dark:bg-blue-400',
  Strategy: 'bg-purple-600 dark:bg-purple-400',
  Data: 'bg-green-600 dark:bg-green-400',
  Influence: 'bg-amber-600 dark:bg-amber-500',
  People: 'bg-rose-600 dark:bg-rose-400',
  Domain: 'bg-slate-500 dark:bg-slate-400',
}

export function Journal() {
  const [q, setQ] = useState('')
  const [type, setType] = useState<EntryType | null>(null)
  const [axis, setAxis] = useState<Axis | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [onlyPublishable, setOnlyPublishable] = useState(false)
  const [ask, setAsk] = useState<Draft | null>(null)
  const tags = useAllTags()

  const all = useLiveQuery(() => db.entries.orderBy('occurredAt').reverse().toArray(), []) ?? []

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter((e) => {
      if (type && e.type !== type) return false
      if (axis && e.axis !== axis) return false
      if (tag && !e.tags.includes(tag)) return false
      if (onlyPublishable && !e.publishable) return false
      if (!needle) return true
      return (
        e.title.toLowerCase().includes(needle) ||
        e.body.toLowerCase().includes(needle) ||
        e.tags.some((t) => t.toLowerCase().includes(needle))
      )
    })
  }, [all, q, type, axis, tag, onlyPublishable])

  const counts = axisCounts(all)
  const max = Math.max(1, ...counts.map(([, n]) => n))
  const cal = calibration(all, today())
  const reviewed = all.filter((e) => e.type === 'Decision' && e.verdict)
  const decisions = all.filter((e) => e.type === 'Decision').slice(0, 25)
  const people = all.filter((e) => e.type === 'People').slice(0, 25)

  return (
    <>
      <Header
        title="Journal"
        action={
          <Link to="/entry/new" className="px-2 py-1 text-[15px] font-semibold text-blue-600 dark:text-blue-400">
            New
          </Link>
        }
      />

      <div className="space-y-6 p-4">
        {/* 역량 축 분포 — 실력 점수가 아니라 시간 분포 */}
        <section>
          <SectionTitle>Where your time goes · {all.length} entries</SectionTitle>
          <Card className="space-y-2">
            {counts.map(([a, n]) => (
              <button
                key={a}
                type="button"
                onClick={() => setAxis(axis === a ? null : a)}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className={`w-20 shrink-0 text-[13px] font-medium ${AXIS_COLOR[a]}`}>{a}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className={`block h-full rounded-full ${AXIS_BAR[a]}`} style={{ width: `${(n / max) * 100}%` }} />
                </span>
                <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-slate-400">{n}</span>
              </button>
            ))}
          </Card>
        </section>

        {/* 캘리브레이션 */}
        <section>
          <SectionTitle
            action={
              reviewed.length >= 3 ? (
                <AskButton label="Run an autopsy" onClick={() => setAsk(askAutopsy(reviewed))} />
              ) : undefined
            }
          >
            Prediction calibration
          </SectionTitle>
          <Card>
            {cal.reviewed === 0 ? (
              <p className="text-[14px] text-slate-500 dark:text-slate-400">
                No reviewed decisions yet. Add a prediction and a review date to a decision, and the app will ask you again on that day.
              </p>
            ) : (
              <>
                <div className="flex gap-4">
                  <Stat value={`${cal.hitRate}%`} label="Hit rate" />
                  <Stat value={cal.reviewed} label="Reviewed" />
                  <Stat value={cal.overdue} label="Overdue" />
                </div>
                <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">
                  Hit {cal.hit} · Partial {cal.partial} · Miss {cal.miss}. The goal is not a higher hit rate — it is noticing whether you miss in a consistent direction.
                </p>
              </>
            )}
          </Card>
        </section>

        {/* 리더십 원칙 — 2026 연 목표 3 */}
        {decisions.length >= 3 && (
          <section>
            <SectionTitle>Leadership principles</SectionTitle>
            <Card>
              <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">
                Principles are extracted from decisions you already made, not invented. {decisions.length} decisions and {people.length} people entries are ready as material.
              </p>
              <AskButton
                className="mt-3"
                label="Extract from my decisions"
                onClick={() => setAsk(askPrinciples(decisions, people))}
              />
            </Card>
          </section>
        )}

        {/* 목록 */}
        <section className="space-y-3">
          <SectionTitle>Entries</SectionTitle>
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, body, tags"
            enterKeyHint="search"
          />

          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            <Chip active={type === null && !onlyPublishable} onClick={() => { setType(null); setOnlyPublishable(false) }}>
              All
            </Chip>
            {ENTRY_TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>
                {t}
              </Chip>
            ))}
            <Chip active={onlyPublishable} onClick={() => setOnlyPublishable(!onlyPublishable)}>
              Publishable
            </Chip>
          </div>

          {(axis || tag) && (
            <div className="flex flex-wrap gap-1.5">
              {axis && <Chip active onClick={() => setAxis(null)}>{axis} ×</Chip>}
              {tag && <Chip active onClick={() => setTag(null)}>#{tag} ×</Chip>}
            </div>
          )}

          {tags.length > 0 && !tag && (
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
              {tags.slice(0, 12).map((t) => (
                <Chip key={t} onClick={() => setTag(t)}>#{t}</Chip>
              ))}
            </div>
          )}

          {filtered.length > 0 ? (
            <>
              <p className="pt-1 text-[13px] text-slate-400 dark:text-slate-500">{filtered.length} entries</p>
              <div className="space-y-2">
                {filtered.map((e) => (
                  <EntryCard key={e.id} entry={e} />
                ))}
              </div>
            </>
          ) : (
            <Empty
              title={all.length ? 'Nothing matches those filters' : 'No entries yet'}
              hint={all.length ? 'Try clearing a filter.' : 'Start with the one-line entry on Today.'}
            />
          )}
        </section>
      </div>

      <AskSheet draft={ask} onClose={() => setAsk(null)} />
    </>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}
