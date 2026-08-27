import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { ENTRY_TYPES, type EntryType } from '../types'
import { useAllTags } from '../lib/hooks'
import { Chip, Empty, Input } from '../components/ui'
import { EntryCard } from '../components/EntryCard'
import { Header } from '../components/Header'

export function Entries() {
  const [q, setQ] = useState('')
  const [type, setType] = useState<EntryType | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const tags = useAllTags()

  const all = useLiveQuery(() => db.entries.orderBy('occurredAt').reverse().toArray(), [])

  const filtered = useMemo(() => {
    if (!all) return []
    const needle = q.trim().toLowerCase()
    return all.filter((e) => {
      if (type && e.type !== type) return false
      if (tag && !e.tags.includes(tag)) return false
      if (!needle) return true
      return (
        e.title.toLowerCase().includes(needle) ||
        e.body.toLowerCase().includes(needle) ||
        e.tags.some((t) => t.toLowerCase().includes(needle))
      )
    })
  }, [all, q, type, tag])

  return (
    <>
      <Header
        title="기록"
        action={
          <Link
            to="/entry/new"
            className="rounded-lg px-2 py-1 text-[15px] font-semibold text-blue-600 dark:text-blue-400"
          >
            새 글
          </Link>
        }
      />

      <div className="space-y-3 p-4">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목·본문·태그 검색"
          enterKeyHint="search"
        />

        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          <Chip active={type === null} onClick={() => setType(null)}>
            전체
          </Chip>
          {ENTRY_TYPES.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>
              {t}
            </Chip>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {tags.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                #{t}
              </Chip>
            ))}
          </div>
        )}

        {filtered.length > 0 ? (
          <>
            <p className="pt-1 text-[13px] text-slate-400 dark:text-slate-500">
              {filtered.length}건
            </p>
            <div className="space-y-2">
              {filtered.map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </div>
          </>
        ) : (
          <Empty
            title={all?.length ? '조건에 맞는 기록이 없습니다' : '아직 기록이 없습니다'}
            hint={all?.length ? '필터를 풀어보세요.' : '오른쪽 위 새 글로 시작하세요.'}
          />
        )}
      </div>
    </>
  )
}
