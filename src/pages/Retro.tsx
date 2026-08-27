import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { formatRange, monthRange, shiftRange, weekRange } from '../lib/date'
import { retroTemplate, retroTitle } from '../lib/templates'
import { Button, Card, Chip, Empty, SectionTitle } from '../components/ui'
import { EntryCard, TypeBadge } from '../components/EntryCard'
import { Header } from '../components/Header'

export function Retro() {
  const navigate = useNavigate()
  const [unit, setUnit] = useState<'week' | 'month'>('week')
  const [range, setRange] = useState<[string, string]>(() => weekRange())

  function switchUnit(next: 'week' | 'month') {
    setUnit(next)
    setRange(next === 'week' ? weekRange() : monthRange())
  }

  const periodEntries =
    useLiveQuery(
      () =>
        db.entries
          .where('occurredAt')
          .between(range[0], range[1], true, true)
          .toArray()
          .then((rows) => rows.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))),
      [range[0], range[1]],
    ) ?? []

  const material = periodEntries.filter((e) => e.type !== '회고')
  const existingRetros = useLiveQuery(
    () => db.entries.where('type').equals('회고').reverse().sortBy('occurredAt'),
    [],
  )

  function write() {
    const body = retroTemplate(unit, range, material)
    const title = retroTitle(unit, range)
    navigate(
      `/entry/new?type=${encodeURIComponent('회고')}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`,
    )
  }

  return (
    <>
      <Header title="회고" />

      <div className="space-y-6 p-4">
        <Card>
          <div className="flex gap-1.5">
            <Chip active={unit === 'week'} onClick={() => switchUnit('week')}>
              주간
            </Chip>
            <Chip active={unit === 'month'} onClick={() => switchUnit('month')}>
              월간
            </Chip>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="이전"
              className="px-2 py-1 text-slate-400"
              onClick={() => setRange((r) => shiftRange(r, unit, -1))}
            >
              ‹
            </button>
            <span className="text-[15px] font-semibold">{formatRange(range)}</span>
            <button
              type="button"
              aria-label="다음"
              className="px-2 py-1 text-slate-400"
              onClick={() => setRange((r) => shiftRange(r, unit, 1))}
            >
              ›
            </button>
          </div>

          <p className="mt-3 text-[14px] text-slate-500 dark:text-slate-400">
            이 기간에 기록 {material.length}건. 회고를 시작하면 그 기록들이 초안에 자동으로
            들어갑니다.
          </p>
          <Button variant="primary" className="mt-3 w-full" onClick={write}>
            {unit === 'week' ? '주간' : '월간'} 회고 쓰기
          </Button>
        </Card>

        <section>
          <SectionTitle>이 기간의 기록</SectionTitle>
          {material.length > 0 ? (
            <Card className="space-y-2.5 p-4">
              {material.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <TypeBadge type={e.type} />
                  <span className="truncate text-[14px]">{e.title || '(제목 없음)'}</span>
                </div>
              ))}
            </Card>
          ) : (
            <Card>
              <Empty title="이 기간에 남긴 기록이 없습니다" hint="회고는 재료가 있어야 써집니다." />
            </Card>
          )}
        </section>

        {existingRetros && existingRetros.length > 0 && (
          <section>
            <SectionTitle>지난 회고</SectionTitle>
            <div className="space-y-2">
              {existingRetros.slice(0, 10).map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
