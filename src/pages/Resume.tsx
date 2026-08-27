import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { ENTRY_TYPES, type EntryType } from '../types'
import { buildResume, type GroupBy } from '../lib/resume'
import { downloadText } from '../lib/backup'
import { renderMarkdown } from '../lib/markdown'
import { useAllTags } from '../lib/hooks'
import { Button, Card, Chip, Input, Label, SectionTitle } from '../components/ui'
import { Header } from '../components/Header'

const GROUP_OPTIONS: GroupBy[] = ['태그', '기간', '없음']

export function Resume() {
  const [title, setTitle] = useState('경력기술서')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [types, setTypes] = useState<EntryType[]>(['성과'])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<GroupBy>('태그')
  const [includeBody, setIncludeBody] = useState(true)
  const [copied, setCopied] = useState(false)

  const allTags = useAllTags()
  const entries = useLiveQuery(() => db.entries.toArray(), []) ?? []
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? []

  const picked = useMemo(
    () =>
      entries.filter((e) => {
        if (types.length && !types.includes(e.type)) return false
        if (from && e.occurredAt < from) return false
        if (to && e.occurredAt > to) return false
        if (selectedTags.length && !selectedTags.some((t) => e.tags.includes(t))) return false
        return true
      }),
    [entries, types, from, to, selectedTags],
  )

  const markdown = useMemo(
    () => buildResume(picked, goals, { title, groupBy, includeBody }),
    [picked, goals, title, groupBy, includeBody],
  )

  function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      alert('복사에 실패했습니다. 아래 미리보기를 길게 눌러 직접 복사하세요.')
    }
  }

  return (
    <>
      <Header title="경력기술서" />

      <div className="space-y-6 p-4">
        <Card className="space-y-4">
          <div>
            <Label>문서 제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <Label>기간 (비우면 전체)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="min-w-0 flex-1"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="shrink-0 text-slate-400">–</span>
              <Input
                type="date"
                className="min-w-0 flex-1"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>포함할 종류</Label>
            <div className="flex flex-wrap gap-1.5">
              {ENTRY_TYPES.map((t) => (
                <Chip key={t} active={types.includes(t)} onClick={() => toggle(types, t, setTypes)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <Label>태그 (비우면 전체)</Label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((t) => (
                  <Chip
                    key={t}
                    active={selectedTags.includes(t)}
                    onClick={() => toggle(selectedTags, t, setSelectedTags)}
                  >
                    #{t}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>묶는 기준</Label>
            <div className="flex gap-1.5">
              {GROUP_OPTIONS.map((g) => (
                <Chip key={g} active={groupBy === g} onClick={() => setGroupBy(g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <Label>본문</Label>
            <div className="flex gap-1.5">
              <Chip active={includeBody} onClick={() => setIncludeBody(true)}>
                전문 싣기
              </Chip>
              <Chip active={!includeBody} onClick={() => setIncludeBody(false)}>
                제목만
              </Chip>
            </div>
          </div>

          <p className="text-[13px] text-slate-500 dark:text-slate-400">{picked.length}건이 담깁니다.</p>

          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" onClick={() => void copy()}>
              {copied ? '복사했습니다' : '마크다운 복사'}
            </Button>
            <Button
              onClick={() =>
                downloadText(markdown, `${title || 'resume'}-${new Date().toISOString().slice(0, 10)}.md`)
              }
            >
              파일로
            </Button>
          </div>
        </Card>

        <section>
          <SectionTitle>미리보기</SectionTitle>
          <Card>
            <div className="prose-note" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />
          </Card>
        </section>
      </div>
    </>
  )
}
