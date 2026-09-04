import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db, newId } from '../db'
import {
  AXES,
  BUILD_BUY_FIELDS,
  ENTRY_TYPES,
  VERDICTS,
  type Axis,
  type BuildBuy,
  type Entry,
  type EntryType,
  type Verdict,
} from '../types'
import { today } from '../lib/date'
import { renderMarkdown } from '../lib/markdown'
import { askBuildBuy, type Draft } from '../lib/ask'
import { useAllTags, useDebouncedEffect } from '../lib/hooks'
import { Button, Chip, Input, Label, Textarea } from '../components/ui'
import { TagInput } from '../components/TagInput'
import { Header } from '../components/Header'
import { AskButton, AskSheet } from '../components/AskSheet'

type Draftable = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>

const EMPTY: Draftable = {
  type: 'Reflection',
  title: '',
  body: '',
  axis: 'Execution',
  tags: [],
  occurredAt: today(),
}

export function EntryEdit() {
  const { id: routeId } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isNew = routeId === 'new'
  const challengeId = params.get('challenge')

  const [id, setId] = useState<string | null>(isNew ? null : (routeId ?? null))
  const [entry, setEntry] = useState<Draftable>(() =>
    isNew
      ? {
          ...EMPTY,
          type: (params.get('type') as EntryType) ?? 'Reflection',
          axis: (params.get('axis') as Axis) ?? 'Execution',
          title: params.get('title') ?? '',
          body: params.get('body') ?? '',
        }
      : EMPTY,
  )
  const [loaded, setLoaded] = useState(isNew)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [preview, setPreview] = useState(false)
  const [reviewing, setReviewing] = useState(params.get('review') === '1')
  const [ask, setAsk] = useState<Draft | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const yearGoals = useLiveQuery(() => db.yearGoals.where('status').equals('Active').toArray(), []) ?? []
  const tags = useAllTags()

  useEffect(() => {
    if (isNew || !routeId) return
    let alive = true
    void db.entries.get(routeId).then((found) => {
      if (!alive) return
      if (!found) return navigate('/journal', { replace: true })
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = found
      setEntry(rest)
      setLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [isNew, routeId, navigate])

  useEffect(() => {
    const el = bodyRef.current
    if (!el || preview) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [entry.body, preview, loaded])

  useDebouncedEffect(
    () => {
      if (!loaded || !dirty) return
      if (!entry.title.trim() && !entry.body.trim() && !id) return
      void (async () => {
        const now = Date.now()
        if (id) {
          await db.entries.update(id, { ...entry, updatedAt: now })
        } else {
          const fresh = newId()
          await db.entries.add({ id: fresh, ...entry, createdAt: now, updatedAt: now })
          if (challengeId) {
            await db.challengeLogs.add({
              id: newId(),
              challengeId,
              entryId: fresh,
              completedAt: now,
            })
          }
          setId(fresh)
          navigate(`/entry/${fresh}`, { replace: true })
        }
        setSavedAt(now)
      })()
    },
    [entry, loaded, dirty],
    500,
  )

  function patch(next: Partial<Draftable>) {
    setDirty(true)
    setEntry((d) => ({ ...d, ...next }))
  }

  function patchBB(next: Partial<BuildBuy>) {
    patch({
      buildBuy: {
        market: '',
        specialness: '',
        upkeep: '',
        costOfBuying: '',
        reversalCost: '',
        ...entry.buildBuy,
        ...next,
      },
    })
  }

  async function remove() {
    if (!id) return navigate(-1)
    if (!confirm('Delete this entry? This cannot be undone.')) return
    await db.entries.delete(id)
    navigate('/journal', { replace: true })
  }

  const isDecision = entry.type === 'Decision'
  const isShip = entry.type === 'Ship'
  const isInput = entry.type === 'Input'

  return (
    <>
      <Header
        title={isNew && !id ? 'New entry' : entry.type}
        back
        action={
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-400 dark:text-slate-500">
              {savedAt ? 'Saved' : dirty ? 'Typing' : ''}
            </span>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="text-[15px] font-medium text-blue-600 dark:text-blue-400"
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
        }
      />

      <div className="space-y-5 p-4">
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {ENTRY_TYPES.map((t) => (
            <Chip key={t} active={entry.type === t} onClick={() => patch({ type: t })}>
              {t}
            </Chip>
          ))}
        </div>

        <Input
          value={entry.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Title — specific enough to find later"
          className="text-[19px] font-semibold"
        />

        {preview ? (
          <div
            className="prose-note min-h-40"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.body || '_Nothing written yet._') }}
          />
        ) : (
          <Textarea
            ref={bodyRef}
            value={entry.body}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="What happened, what you did, how it turned out."
            className="min-h-40 overflow-hidden"
          />
        )}

        <div>
          <Label>Axis</Label>
          <div className="flex flex-wrap gap-1.5">
            {AXES.map((a) => (
              <Chip key={a} active={entry.axis === a} onClick={() => patch({ axis: a })}>
                {a}
              </Chip>
            ))}
          </div>
        </div>

        {/* ── 결정 전용 ─────────────────────────────── */}
        {isDecision && (
          <section className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/30">
            <h2 className="text-[15px] font-bold">Prediction — without this it is just a diary</h2>
            <Field label="Alternatives dropped" value={entry.alternatives} onChange={(v) => patch({ alternatives: v })} placeholder="What you chose not to do" />
            <Field label="Prediction" value={entry.prediction} onChange={(v) => patch({ prediction: v })} placeholder="In six weeks, what has to be true for this to be right?" />
            <Field label="What would prove me wrong" value={entry.failCondition} onChange={(v) => patch({ failCondition: v })} placeholder="What signal means you got this wrong?" />
            <div>
              <Label>Review date</Label>
              <Input type="date" value={entry.reviewDate ?? ''} onChange={(e) => patch({ reviewDate: e.target.value })} />
              <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                On that day this prediction comes back to the top of Today.
              </p>
            </div>

            {(reviewing || entry.verdict) && (
              <div className="space-y-4 border-t border-violet-200 pt-4 dark:border-violet-900">
                <h3 className="text-[15px] font-bold">Review</h3>
                <Field label="What actually happened" value={entry.result} onChange={(v) => patch({ result: v })} placeholder="Use numbers if you have them" />
                <div>
                  <Label>Verdict</Label>
                  <div className="flex gap-1.5">
                    {VERDICTS.map((v) => (
                      <Chip
                        key={v}
                        active={entry.verdict === v}
                        onClick={() => patch({ verdict: v as Verdict, reviewedAt: Date.now() })}
                      >
                        {v}
                      </Chip>
                    ))}
                  </div>
                </div>
                <Field label="What you missed" value={entry.missed} onChange={(v) => patch({ missed: v })} placeholder="If this repeats, it is your bias" />
              </div>
            )}
            {!reviewing && !entry.verdict && entry.reviewDate && (
              <Button className="w-full" onClick={() => setReviewing(true)}>
                Review it now
              </Button>
            )}

            <div className="border-t border-violet-200 pt-4 dark:border-violet-900">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold">Build vs Buy</span>
                {id && <AskButton label="Get the counter-case" onClick={() => setAsk(askBuildBuy({ id, createdAt: 0, updatedAt: 0, ...entry }))} />}
              </div>
              {BUILD_BUY_FIELDS.map((f) => (
                <div key={f.key} className="mb-3">
                  <Label>{f.label}</Label>
                  <Textarea
                    rows={2}
                    value={entry.buildBuy?.[f.key] ?? ''}
                    onChange={(e) => patchBB({ [f.key]: e.target.value } as Partial<BuildBuy>)}
                    placeholder={f.hint}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 출시·실험 전용 ────────────────────────── */}
        {isShip && (
          <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <Field label="Hypothesis" value={entry.hypothesis} onChange={(v) => patch({ hypothesis: v })} placeholder="What you believe is true as you ship" />
            <Field label="Metric" value={entry.metric} onChange={(v) => patch({ metric: v })} placeholder="What you will watch" />
            <Field label="Result" value={entry.result} onChange={(v) => patch({ result: v })} placeholder="Fill this in later" />
            <div>
              <Label>How you find out it is wrong · required</Label>
              <Textarea
                rows={2}
                value={entry.howWeKnowItsWrong ?? ''}
                onChange={(e) => patch({ howWeKnowItsWrong: e.target.value })}
                placeholder="Who finds out, when, and from what signal?"
              />
              <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">
                HR AI fails quietly. If you cannot fill this in, it is not ready to ship.
              </p>
            </div>
          </section>
        )}

        {/* ── 인풋 전용 ─────────────────────────────── */}
        {isInput && (
          <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <Field label="Source link" value={entry.sourceUrl} onChange={(v) => patch({ sourceUrl: v })} placeholder="https://" />
            <Field label="So I will" value={entry.soWhat} onChange={(v) => patch({ soWhat: v })} placeholder="One sentence you can actually act on this week" />
          </section>
        )}

        <div>
          <Label>Date</Label>
          <Input type="date" value={entry.occurredAt} onChange={(e) => patch({ occurredAt: e.target.value || today() })} />
        </div>

        {yearGoals.length > 0 && (
          <div>
            <Label>Which year goal this serves</Label>
            <div className="flex flex-wrap gap-1.5">
              {yearGoals.map((g) => (
                <Chip
                  key={g.id}
                  active={entry.yearGoalId === g.id}
                  onClick={() => patch({ yearGoalId: entry.yearGoalId === g.id ? undefined : g.id })}
                >
                  {g.title}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>Tags</Label>
          <TagInput value={entry.tags} onChange={(t) => patch({ tags: t })} suggestions={tags} />
        </div>

        <button
          type="button"
          onClick={() => patch({ publishable: !entry.publishable })}
          className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
            entry.publishable
              ? 'border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/50'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <span
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
              entry.publishable ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {entry.publishable && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M5 12l5 5L19 7" />
              </svg>
            )}
          </span>
          <span>
            <span className="block text-[15px] font-medium">Publishable material</span>
            <span className="mt-0.5 block text-[13px] text-slate-500 dark:text-slate-400">
              Strip the proper nouns and this could be an article. Thought leadership in ten years starts with this checkbox today.
            </span>
          </span>
        </button>

        <Button variant="danger" className="w-full" onClick={() => void remove()}>
          Delete
        </Button>
      </div>

      <AskSheet draft={ask} onClose={() => setAsk(null)} />
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea rows={2} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
