import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '../db'
import type { Advisor, Session } from '../types'
import { SEAT_HINTS } from '../seed/advisors'
import { isoFromTs, relativeKo } from '../lib/date'
import { askBoard, type Draft } from '../lib/ask'
import { useDebouncedEffect } from '../lib/hooks'
import { Button, Card, Chip, Empty, Label, SectionTitle, Textarea, cx } from '../components/ui'
import { Header } from '../components/Header'
import { AskSheet } from '../components/AskSheet'

interface BoardReply {
  actionItems?: string[]
}

export function Board() {
  const [openSession, setOpenSession] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)

  const advisors = useLiveQuery(() => db.advisors.orderBy('order').toArray(), []) ?? []
  const sessions = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().toArray(), []) ?? []

  if (composing || openSession) {
    return (
      <SessionView
        sessionId={openSession}
        advisors={advisors}
        onClose={() => {
          setComposing(false)
          setOpenSession(null)
        }}
        onOpened={(id) => {
          setComposing(false)
          setOpenSession(id)
        }}
      />
    )
  }

  return (
    <>
      <Header
        title="Board"
        action={
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="px-2 py-1 text-[15px] font-semibold text-blue-600 dark:text-blue-400"
          >
            Ask
          </button>
        }
      />

      <div className="space-y-6 p-4">
        <Card>
          <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">
            Seven people occupy your C-level seats. When you are stuck, pick a seat and look again through "where would this person look?"
          </p>
          <p className="mt-2 text-[13px] leading-6 text-slate-500 dark:text-slate-400">
            These are not quotes from real people — they are thinking frames from their public writing. The prompt carries an explicit "do not invent their words" constraint.
          </p>
          <Button variant="primary" className="mt-3 w-full" onClick={() => setComposing(true)}>
            Bring a problem
          </Button>
        </Card>

        <section>
          <SectionTitle>Seats</SectionTitle>
          <div className="space-y-2">
            {advisors.map((a) => (
              <Card key={a.id}>
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400">
                    {a.seat}
                  </span>
                  <span className="font-semibold">{a.name}</span>
                </div>
                <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-300">{a.lens}</p>
                <ul className="mt-2 space-y-1">
                  {a.questions.map((q) => (
                    <li key={q} className="text-[13px] leading-6 text-slate-500 dark:text-slate-400">
                      · {q}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Past sessions</SectionTitle>
          {sessions.length ? (
            <div className="space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOpenSession(s.id)}
                  className="block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="text-[12px] text-slate-400 dark:text-slate-500">
                    {relativeKo(isoFromTs(s.createdAt))} ·{' '}
                    {s.advisorIds
                      .map((id) => advisors.find((a) => a.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="mt-1 line-clamp-2 font-medium">{s.problem || '(empty)'}</p>
                  {s.actionItems.length > 0 && (
                    <p className="mt-1 text-[13px] text-blue-600 dark:text-blue-400">
                      {s.actionItems.length} action items
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <Card>
              <Empty title="No sessions yet" hint="Bring one decision you are stuck on." />
            </Card>
          )}
        </section>
      </div>
    </>
  )
}

function SessionView({
  sessionId,
  advisors,
  onClose,
  onOpened,
}: {
  sessionId: string | null
  advisors: Advisor[]
  onClose: () => void
  onOpened: (id: string) => void
}) {
  const existing = useLiveQuery(
    async () => (sessionId ? await db.sessions.get(sessionId) : undefined),
    [sessionId],
  )
  const asks = useLiveQuery(
    async () => (sessionId ? await db.asks.where('originId').equals(sessionId).toArray() : []),
    [sessionId],
  )

  const [problem, setProblem] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [ask, setAsk] = useState<Draft | null>(null)

  // 지금 편집 중인 세션의 id. 새로 만들면 여기에 담기므로 prop 타이밍에 기대지 않습니다.
  const idRef = useRef<string | null>(sessionId)
  // 내가 만든 세션을 되읽어 로컬 입력을 덮어쓰는 사고를 막습니다.
  const hydrated = useRef(sessionId === null)

  useEffect(() => {
    if (hydrated.current || !existing) return
    hydrated.current = true
    setProblem(existing.problem)
    setPicked(existing.advisorIds)
    setAnswers(existing.selfAnswers)
  }, [existing])

  const chosen = advisors.filter((a) => picked.includes(a.id))

  async function persist(extra?: Partial<Session>): Promise<string> {
    const now = Date.now()
    const current = idRef.current
    if (current) {
      await db.sessions.update(current, {
        problem,
        advisorIds: picked,
        selfAnswers: answers,
        updatedAt: now,
        ...extra,
      })
      return current
    }
    const id = newId()
    idRef.current = id
    await db.sessions.add({
      id,
      problem,
      advisorIds: picked,
      selfAnswers: answers,
      actionItems: [],
      createdAt: now,
      updatedAt: now,
      ...extra,
    })
    onOpened(id)
    return id
  }

  // 입력이 멈추면 저장. 좌석을 고르거나 답을 쓰는 것도 같이 남습니다.
  useDebouncedEffect(
    () => {
      if (!problem.trim()) return
      void persist()
    },
    [problem, picked, answers],
    600,
  )

  const replies = (asks ?? []).filter((a) => a.reply)

  return (
    <>
      <Header
        title="Session"
        action={
          <button type="button" onClick={onClose} className="px-2 py-1 text-[15px] font-medium text-blue-600 dark:text-blue-400">
            Close
          </button>
        }
      />

      <div className="space-y-6 p-4">
        <div>
          <Label>What are you stuck on?</Label>
          <Textarea
            rows={4}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="A decision you cannot make, or something you keep hitting. Context helps the seats see more."
          />
        </div>

        <div>
          <Label>What kind of problem is it?</Label>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {SEAT_HINTS.map((h) => (
              <Chip key={h.label} onClick={() => setPicked(h.advisorIds)}>
                {h.label}
              </Chip>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-slate-400 dark:text-slate-500">
            Tap one to preselect fitting seats, or choose them yourself.
          </p>
        </div>

        <div>
          <Label>Seats · {picked.length}</Label>
          <div className="flex flex-wrap gap-1.5">
            {advisors.map((a) => (
              <Chip
                key={a.id}
                active={picked.includes(a.id)}
                onClick={() =>
                  setPicked((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))
                }
              >
                {a.name}
              </Chip>
            ))}
          </div>
        </div>

        {chosen.length > 0 && (
          <section className="space-y-4">
            <SectionTitle>Answer these yourself first</SectionTitle>
            <p className="-mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              This much runs without any LLM. Half the time it resolves right here.
            </p>
            {chosen.map((a) => (
              <Card key={a.id} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400">
                    {a.seat}
                  </span>
                  <span className="font-semibold">{a.name}</span>
                </div>
                {a.questions.map((q, i) => (
                  <div key={q}>
                    <p className="mb-1.5 text-[14px] leading-6">{q}</p>
                    <Textarea
                      rows={2}
                      value={answers[`${a.id}:${i}`] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [`${a.id}:${i}`]: e.target.value }))}
                                placeholder="'I don't know' is a valid answer"
                    />
                  </div>
                ))}
              </Card>
            ))}

            <Button
              variant="primary"
              className={cx('w-full', !problem.trim() && 'opacity-50')}
              disabled={!problem.trim()}
              onClick={async () => {
                const id = await persist()
                setAsk(askBoard(problem, chosen, answers, id))
              }}
            >
              Still stuck — hand it to an LLM
            </Button>
          </section>
        )}

        {replies.length > 0 && (
          <section>
            <SectionTitle>Answers received</SectionTitle>
            <div className="space-y-2">
              {replies.map((a) => (
                <Card key={a.id}>
                  <p className="text-[12px] text-slate-400 dark:text-slate-500">{a.title}</p>
                  <p className="mt-1.5 text-[14px] leading-7 whitespace-pre-wrap">{a.reply}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {existing && existing.actionItems.length > 0 && (
          <section>
            <SectionTitle>Action items</SectionTitle>
            <Card className="space-y-2">
              {existing.actionItems.map((it) => (
                <p key={it} className="text-[14px] leading-6">· {it}</p>
              ))}
              <p className="pt-1 text-[12px] text-slate-400 dark:text-slate-500">
                You can promote these to weekly goals from the Plan tab.
              </p>
            </Card>
          </section>
        )}
      </div>

      <AskSheet
        draft={ask}
        onClose={() => setAsk(null)}
        onResult={async (_reply, parsed) => {
          const items = (parsed as BoardReply)?.actionItems
          const target = idRef.current
          if (Array.isArray(items) && items.length && target) {
            await db.sessions.update(target, {
              actionItems: items.filter((s) => typeof s === 'string').slice(0, 5),
              updatedAt: Date.now(),
            })
          }
        }}
      />
    </>
  )
}
