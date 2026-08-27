import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '../db'
import { GOAL_KINDS, GOAL_STATUSES, type Goal, type GoalKind } from '../types'
import { Button, Card, Chip, Empty, Input, Label, SectionTitle, Textarea } from '../components/ui'
import { Header } from '../components/Header'

const STATUS_STYLE: Record<Goal['status'], string> = {
  진행중: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  완료: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  보류: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

function GoalForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: Goal
  onDone: () => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<GoalKind>(initial?.kind ?? '목표')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [detail, setDetail] = useState(initial?.detail ?? '')
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? '')

  async function save() {
    if (!title.trim()) return
    const now = Date.now()
    if (initial) {
      await db.goals.update(initial.id, { kind, title, detail, targetDate, updatedAt: now })
    } else {
      await db.goals.add({
        id: newId(),
        kind,
        title,
        detail,
        targetDate,
        status: '진행중',
        createdAt: now,
        updatedAt: now,
      })
    }
    onDone()
  }

  return (
    <Card className="space-y-4">
      <div className="flex gap-1.5">
        {GOAL_KINDS.map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {k}
          </Chip>
        ))}
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === '목표' ? '올해 안에 무엇을 이룰까' : '어떤 스킬을 키울까'}
        autoFocus
      />
      <Textarea
        rows={3}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="어떻게 하면 이뤘다고 할 수 있나"
      />
      {kind === '목표' && (
        <div>
          <Label>기한 (선택)</Label>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" disabled={!title.trim()} onClick={() => void save()}>
          저장
        </Button>
        <Button onClick={onCancel}>취소</Button>
      </div>
    </Card>
  )
}

function GoalRow({ goal, count }: { goal: Goal; count: number }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <GoalForm initial={goal} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
  }

  async function cycleStatus() {
    const next = GOAL_STATUSES[(GOAL_STATUSES.indexOf(goal.status) + 1) % GOAL_STATUSES.length]
    await db.goals.update(goal.id, { status: next, updatedAt: Date.now() })
  }

  async function remove() {
    if (!confirm(`"${goal.title}"을(를) 지울까요?`)) return
    await db.goals.delete(goal.id)
  }

  return (
    <Card>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => void cycleStatus()}
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[goal.status]}`}
        >
          {goal.status}
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{goal.title}</h3>
          {goal.detail && (
            <p className="mt-0.5 text-[14px] whitespace-pre-wrap text-slate-500 dark:text-slate-400">
              {goal.detail}
            </p>
          )}
          <p className="mt-1.5 text-[12px] text-slate-400 dark:text-slate-500">
            연결된 기록 {count}건{goal.targetDate ? ` · 기한 ${goal.targetDate}` : ''}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" onClick={() => setEditing(true)}>
          수정
        </Button>
        <Button variant="danger" onClick={() => void remove()}>
          삭제
        </Button>
      </div>
    </Card>
  )
}

export function Goals() {
  const [adding, setAdding] = useState(false)
  const goals = useLiveQuery(() => db.goals.orderBy('updatedAt').reverse().toArray(), [])
  const counts =
    useLiveQuery(async () => {
      const entries = await db.entries.toArray()
      const map = new Map<string, number>()
      for (const e of entries) for (const gid of e.goalIds ?? []) map.set(gid, (map.get(gid) ?? 0) + 1)
      return map
    }, []) ?? new Map<string, number>()

  return (
    <>
      <Header
        title="목표·스킬"
        action={
          !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="px-2 py-1 text-[15px] font-semibold text-blue-600 dark:text-blue-400"
            >
              추가
            </button>
          )
        }
      />

      <div className="space-y-6 p-4">
        {adding && <GoalForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}

        {GOAL_KINDS.map((kind) => {
          const items = (goals ?? []).filter((g) => g.kind === kind)
          if (!items.length) return null
          return (
            <section key={kind}>
              <SectionTitle>{kind}</SectionTitle>
              <div className="space-y-2">
                {items.map((g) => (
                  <GoalRow key={g.id} goal={g} count={counts.get(g.id) ?? 0} />
                ))}
              </div>
            </section>
          )
        })}

        {goals && goals.length === 0 && !adding && (
          <Card>
            <Empty
              title="목표와 스킬을 등록해보세요"
              hint="기록을 쓸 때 목표에 연결하면, 무엇에 시간을 썼는지 숫자로 보입니다."
            />
          </Card>
        )}
      </div>
    </>
  )
}
