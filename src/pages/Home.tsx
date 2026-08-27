import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { db, newId } from '../db'
import { streakDays, today, weekRange } from '../lib/date'
import { Button, Card, Empty, SectionTitle, Textarea } from '../components/ui'
import { EntryCard } from '../components/EntryCard'
import { Header } from '../components/Header'
import { InstallBanner } from '../components/InstallBanner'

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}

export function Home() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)

  const recent = useLiveQuery(
    () => db.entries.orderBy('occurredAt').reverse().limit(5).toArray(),
    [],
  )
  const stats = useLiveQuery(async () => {
    const all = await db.entries.toArray()
    const [from, to] = weekRange()
    return {
      total: all.length,
      thisWeek: all.filter((e) => e.occurredAt >= from && e.occurredAt <= to).length,
      streak: streakDays(all.map((e) => e.occurredAt)),
    }
  }, [])

  async function quickSave(openEditor: boolean) {
    const text = draft.trim()
    if (!text) return
    const [first, ...rest] = text.split('\n')
    const now = Date.now()
    const id = newId()
    await db.entries.add({
      id,
      type: '성과',
      title: first.slice(0, 80),
      body: rest.join('\n').trim(),
      tags: [],
      goalIds: [],
      occurredAt: today(),
      createdAt: now,
      updatedAt: now,
    })
    setDraft('')
    if (openEditor) {
      navigate(`/entry/${id}`)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }
  }

  return (
    <>
      <Header title="커리어 기록" action={
        <Link to="/settings" aria-label="설정" className="p-1 text-slate-400 dark:text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.3-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </Link>
      } />

      <InstallBanner />

      <div className="space-y-6 p-4">
        <Card className="p-0">
          <div className="flex gap-4 border-b border-slate-100 p-4 dark:border-slate-800">
            <Stat value={stats?.thisWeek ?? 0} label="이번 주" />
            <Stat value={stats?.streak ?? 0} label="연속 기록" />
            <Stat value={stats?.total ?? 0} label="전체" />
          </div>
          <div className="p-4">
            <Textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="오늘 한 일 한 줄. 나중에 이게 이력서가 됩니다."
            />
            <div className="mt-2 flex items-center gap-2">
              <Button variant="primary" className="flex-1" disabled={!draft.trim()} onClick={() => void quickSave(false)}>
                {saved ? '저장했습니다' : '기록'}
              </Button>
              <Button disabled={!draft.trim()} onClick={() => void quickSave(true)}>
                이어서 쓰기
              </Button>
            </div>
          </div>
        </Card>

        <section>
          <SectionTitle
            action={
              <Link to="/entries" className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
                전체 보기
              </Link>
            }
          >
            최근 기록
          </SectionTitle>
          {recent && recent.length > 0 ? (
            <div className="space-y-2">
              {recent.map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </div>
          ) : (
            <Card>
              <Empty title="아직 기록이 없습니다" hint="위에 한 줄만 적어보세요." />
            </Card>
          )}
        </section>
      </div>
    </>
  )
}
