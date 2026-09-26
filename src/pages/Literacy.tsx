import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '../db'
import type { Entry, Rep, Story } from '../types'
import { today } from '../lib/date'
import { askCritique, askStoryFromEntry, type Draft } from '../lib/ask'
import { STRUCTURES, structureById } from '../seed/structures'
import { pickPrompt, PROMPTS, type SpeakPrompt } from '../seed/prompts'
import { Button, Card, Chip, Input, Label, SectionTitle, Textarea } from '../components/ui'
import { Header } from '../components/Header'
import { AskButton, AskSheet } from '../components/AskSheet'

type Tab = 'reps' | 'stories'

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function Literacy() {
  const [tab, setTab] = useState<Tab>('reps')
  const [ask, setAsk] = useState<Draft | null>(null)
  const [pendingStory, setPendingStory] = useState<string | null>(null)

  const reps = useLiveQuery(() => db.reps.orderBy('createdAt').reverse().toArray(), []) ?? []
  const stories = useLiveQuery(() => db.stories.orderBy('updatedAt').reverse().toArray(), []) ?? []

  return (
    <>
      <Header title="Literacy" />
      <div className="space-y-6 p-4">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(['reps', 'stories'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-[16px] font-semibold whitespace-nowrap ${
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700'
              }`}
            >
              {t === 'reps' ? 'Reps' : `Stories · ${stories.length}`}
            </button>
          ))}
        </div>

        {tab === 'reps' ? (
          <Reps reps={reps} stories={stories} onAsk={setAsk} />
        ) : (
          <Stories
            stories={stories}
            onAsk={(d, entryId) => {
              setPendingStory(entryId ?? null)
              setAsk(d)
            }}
            onRehearse={() => setTab('reps')}
          />
        )}
      </div>

      <AskSheet
        draft={ask}
        onClose={() => {
          setAsk(null)
          setPendingStory(null)
        }}
        onResult={async (reply, parsed) => {
          const d = (parsed ?? {}) as { title?: string; point?: string; telling?: string }
          // 스토리 수확의 답만 새 스토리가 됩니다. 비평은 rep에 붙습니다.
          if (!d.telling && !d.point) return
          const now = Date.now()
          await db.stories.add({
            id: newId(),
            title: d.title || 'Untitled story',
            point: d.point || '',
            telling: d.telling || reply,
            tags: [],
            entryId: pendingStory ?? undefined,
            createdAt: now,
            updatedAt: now,
            timesTold: 0,
          })
          setPendingStory(null)
          setTab('stories')
        }}
      />
    </>
  )
}

/* ── 리허설 ─────────────────────────────────────────────── */

function Reps({
  reps,
  stories,
  onAsk,
}: {
  reps: Rep[]
  stories: Story[]
  onAsk: (d: Draft) => void
}) {
  const iso = today()
  // 오늘 기록한 rep은 세지 않습니다. 포함하면 로그를 남기는 순간 "오늘의 질문"이
  // 눈앞에서 다른 것으로 바뀝니다 — 하루 동안은 같은 질문이어야 합니다.
  const midnight = useMemo(() => new Date(`${iso}T00:00:00`).getTime(), [iso])
  const daily = useMemo(
    () => pickPrompt(iso, reps.filter((r) => r.createdAt < midnight).map((r) => r.promptId ?? '')),
    [iso, midnight, reps],
  )

  const [prompt, setPrompt] = useState<SpeakPrompt | null>(null)
  const [custom, setCustom] = useState('')
  const [storyId, setStoryId] = useState<string | null>(null)
  const [structure, setStructure] = useState<string | undefined>(undefined)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [picking, setPicking] = useState(false)
  const startedAt = useRef(0)

  const active = prompt ?? daily
  const story = stories.find((s) => s.id === storyId)
  const text = custom.trim() || (story ? `Tell this story: ${story.title}` : active.text)
  const target = story ? 90 : active.targetSec

  // 추천 틀을 미리 골라둡니다 — 고르는 것 자체가 마찰이라서.
  // structure를 의존성에 넣어야 rep을 기록해 초기화된 뒤에도 다시 채워집니다.
  // 빼두면 한 번 비워진 채로 영영 안 돌아옵니다.
  useEffect(() => {
    if (!structure) setStructure(story ? 'three-act' : active.suggests)
  }, [active.id, storyId, structure, active.suggests, story])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 250)
    return () => clearInterval(t)
  }, [running])

  function start() {
    startedAt.current = Date.now()
    setElapsed(0)
    setDone(false)
    setTranscript('')
    setRunning(true)
  }
  function stop() {
    setRunning(false)
    setDone(true)
  }
  function reset() {
    setRunning(false)
    setDone(false)
    setElapsed(0)
    setTranscript('')
    setPrompt(null)
    setStoryId(null)
    setCustom('')
    setStructure(undefined)
  }

  async function log() {
    await db.reps.add({
      id: newId(),
      promptId: custom.trim() || story ? undefined : active.id,
      prompt: text,
      structureId: structure,
      storyId: storyId ?? undefined,
      targetSec: target,
      spokenSec: elapsed,
      transcript: transcript.trim() || undefined,
      createdAt: Date.now(),
    })
    if (story) {
      await db.stories.update(story.id, { lastToldAt: Date.now(), timesTold: story.timesTold + 1 })
    }
    reset()
  }

  const week = reps.filter((r) => Date.now() - r.createdAt < 7 * 86_400_000)
  const over = elapsed > target

  return (
    <>
      <section>
        <SectionTitle>{story ? 'Rehearse a story' : "Today's rep"}</SectionTitle>
        <Card className="space-y-4">
          {!story && !custom && (
            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[13px] font-semibold text-slate-700">
              {active.category}
            </span>
          )}
          <p className="text-[19px] leading-8 font-medium text-slate-900">{text}</p>

          {/* 틀은 라이브러리가 아니라 여기서만 나옵니다 */}
          <div>
            <Label>Structure</Label>
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {STRUCTURES.map((s) => (
                <Chip key={s.id} active={structure === s.id} onClick={() => setStructure(s.id)}>
                  {s.name}
                </Chip>
              ))}
            </div>
            {structure && (
              <div className="mt-2 rounded-xl bg-slate-100 p-3">
                <p className="text-[14px] text-slate-700">{structureById(structure)?.when}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px] leading-7 text-slate-800">
                  {structureById(structure)?.beats.map((b) => <li key={b}>{b}</li>)}
                </ol>
              </div>
            )}
          </div>

          {/* 타이머 */}
          <div className="rounded-xl bg-slate-100 p-4 text-center">
            <p className={`text-[44px] leading-none font-bold tabular-nums ${over ? 'text-amber-600' : 'text-slate-900'}`}>
              {mmss(elapsed)}
            </p>
            <p className="mt-1 text-[14px] text-slate-700">
              target {mmss(target)}
              {over && ` · ${mmss(elapsed - target)} over`}
            </p>
            <div className="mt-3 flex gap-2">
              {!running && !done && (
                <Button variant="primary" className="flex-1" onClick={start}>
                  Start — then speak out loud
                </Button>
              )}
              {running && (
                <Button variant="primary" className="flex-1" onClick={stop}>
                  Stop
                </Button>
              )}
              {done && (
                <>
                  <Button className="flex-1" onClick={start}>Again</Button>
                  <Button variant="primary" className="flex-1" onClick={() => void log()}>
                    Log this rep
                  </Button>
                </>
              )}
            </div>
          </div>

          {done && (
            <div>
              <Label>What you said · optional</Label>
              <Textarea
                rows={5}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Tap the microphone on your keyboard and say it again — iOS types it for you. Leave empty to log the rep without a transcript."
              />
              {transcript.trim() && (
                <AskButton
                  label="Critique what I said"
                  onClick={() =>
                    onAsk(askCritique(text, structureById(structure)?.name, target, elapsed, transcript))
                  }
                />
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" onClick={() => setPicking(!picking)}>
              {picking ? 'Close' : 'Different question'}
            </Button>
            {stories.length > 0 && !story && (
              <Button
                className="flex-1"
                onClick={() => {
                  const stale = [...stories].sort((a, b) => (a.lastToldAt ?? 0) - (b.lastToldAt ?? 0))[0]
                  setStoryId(stale.id)
                  setStructure('three-act')
                }}
              >
                Rehearse a story
              </Button>
            )}
            {(story || custom) && <Button className="flex-1" onClick={reset}>Back to today's</Button>}
          </div>

          {picking && (
            <div className="space-y-3 border-t border-slate-200 pt-3">
              <div>
                <Label>Write your own</Label>
                <Input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="A question you expect to get this week"
                />
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {PROMPTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPrompt(p)
                      setCustom('')
                      setStoryId(null)
                      setStructure(p.suggests)
                      setPicking(false)
                    }}
                    className="block w-full rounded-lg p-2 text-left text-[15px] leading-6 text-slate-800 active:bg-slate-100"
                  >
                    <span className="mr-1.5 text-[13px] font-semibold text-slate-600">{p.category}</span>
                    {p.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>This week · {week.length} {week.length === 1 ? 'rep' : 'reps'}</SectionTitle>
        {reps.length ? (
          <div className="space-y-2">
            {reps.slice(0, 15).map((r) => (
              <Card key={r.id}>
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-slate-900">
                    {mmss(r.spokenSec)}
                  </span>
                  {r.structureId && (
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[13px] font-semibold text-slate-700">
                      {structureById(r.structureId)?.name}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[15px] text-slate-700">{r.prompt}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-[16px] leading-7 text-slate-700">
              Nothing yet. Reading about speaking builds nothing — the mouth needs the reps, not the
              eyes. Two minutes out loud beats an hour of notes.
            </p>
          </Card>
        )}
      </section>
    </>
  )
}

/* ── 스토리 재고 ────────────────────────────────────────── */

function Stories({
  stories,
  onAsk,
  onRehearse,
}: {
  stories: Story[]
  onAsk: (d: Draft, entryId?: string) => void
  onRehearse: () => void
}) {
  const [harvesting, setHarvesting] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  // 결과가 적힌 결정·출시만 후보입니다. 긴장과 결말이 있어야 이야기가 됩니다.
  const candidates =
    useLiveQuery(async () => {
      const all = await db.entries.orderBy('occurredAt').reverse().toArray()
      const taken = new Set((await db.stories.toArray()).map((s) => s.entryId).filter(Boolean))
      return all
        .filter((e) => !taken.has(e.id))
        .filter((e) => (e.type === 'Decision' && e.verdict) || (e.type === 'Ship' && e.result?.trim()))
        .slice(0, 20)
    }, []) ?? []

  async function addBlank() {
    const now = Date.now()
    const id = newId()
    await db.stories.add({
      id,
      title: 'Untitled story',
      point: '',
      telling: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
      timesTold: 0,
    })
    setEditing(id)
  }

  return (
    <>
      <section>
        <SectionTitle
          action={
            <button type="button" onClick={() => void addBlank()} className="text-[15px] font-semibold text-blue-600">
              Add
            </button>
          }
        >
          Your stories
        </SectionTitle>

        {stories.length ? (
          <div className="space-y-2">
            {stories.map((s) =>
              editing === s.id ? (
                <StoryEdit key={s.id} story={s} onClose={() => setEditing(null)} />
              ) : (
                <Card key={s.id}>
                  <h3 className="text-[17px] font-semibold text-slate-900">{s.title}</h3>
                  {s.point && <p className="mt-1 text-[15px] leading-7 text-slate-700">{s.point}</p>}
                  <p className="mt-2 text-[14px] text-slate-600">
                    {s.timesTold ? `Told ${s.timesTold}×` : 'Never told out loud'}
                    {s.lastToldAt && ` · last ${Math.round((Date.now() - s.lastToldAt) / 86_400_000)}d ago`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button className="flex-1" onClick={() => setEditing(s.id)}>Edit</Button>
                    <Button variant="primary" className="flex-1" onClick={onRehearse}>Rehearse</Button>
                  </div>
                </Card>
              ),
            )}
          </div>
        ) : (
          <Card>
            <p className="text-[16px] leading-7 text-slate-700">
              Empty. The people who can hold a room for an hour are not improvising — they are
              retrieving. Twenty rehearsed stories is what an hour is made of.
            </p>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle
          action={
            <button
              type="button"
              onClick={() => setHarvesting(!harvesting)}
              className="text-[15px] font-semibold text-blue-600"
            >
              {harvesting ? 'Close' : 'Open'}
            </button>
          }
        >
          Harvest from your journal · {candidates.length}
        </SectionTitle>

        {harvesting ? (
          candidates.length ? (
            <div className="space-y-2">
              {candidates.map((e) => (
                <Card key={e.id}>
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[13px] font-semibold text-slate-700">
                      {e.type}
                    </span>
                    <span className="min-w-0 flex-1 text-[16px] font-medium text-slate-900">{e.title}</span>
                  </div>
                  <AskButton
                    label="Turn this into a story"
                    onClick={() => onAsk(draftFor(e), e.id)}
                  />
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-[16px] leading-7 text-slate-700">
                Nothing ripe yet. A decision becomes a story once you have written down how it turned
                out — tension needs a resolution. Close the loop on a Decision or a Ship and it shows
                up here.
              </p>
            </Card>
          )
        ) : (
          <Card>
            <p className="text-[16px] leading-7 text-slate-700">
              Your journal already holds the raw material — decisions with a verdict, ships with a
              result. Those have tension and an ending, which is most of what a story needs.
            </p>
          </Card>
        )}
      </section>
    </>
  )
}

function draftFor(e: Entry): Draft {
  return askStoryFromEntry(e.title, e.body, {
    'What I predicted': e.prediction,
    'How it turned out': e.verdict ?? e.result,
    'What I missed': e.missed,
    'Alternatives I dropped': e.alternatives,
    'Hypothesis': e.hypothesis,
    'Metric': e.metric,
  })
}

function StoryEdit({ story, onClose }: { story: Story; onClose: () => void }) {
  const [title, setTitle] = useState(story.title)
  const [point, setPoint] = useState(story.point)
  const [telling, setTelling] = useState(story.telling)

  return (
    <Card className="space-y-3">
      <div>
        <Label>Title — how you would introduce it</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>The point — what this story is for</Label>
        <Textarea rows={2} value={point} onChange={(e) => setPoint(e.target.value)} placeholder="One sentence. A story without a point is an anecdote." />
      </div>
      <div>
        <Label>The 90-second telling</Label>
        <Textarea rows={8} value={telling} onChange={(e) => setTelling(e.target.value)} placeholder="Write it as speech, not prose. Short sentences. Concrete details." />
      </div>
      <div className="flex gap-2">
        <Button variant="danger" onClick={async () => { await db.stories.delete(story.id); onClose() }}>
          Delete
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={async () => {
            await db.stories.update(story.id, { title: title.trim() || 'Untitled story', point, telling, updatedAt: Date.now() })
            onClose()
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  )
}
