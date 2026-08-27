import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db, newId } from '../db'
import { ENTRY_TYPES, type Entry, type EntryType } from '../types'
import { today } from '../lib/date'
import { renderMarkdown } from '../lib/markdown'
import { STAR_TEMPLATE } from '../lib/templates'
import { useAllTags, useDebouncedEffect } from '../lib/hooks'
import { Button, Chip, Input, Label, Textarea } from '../components/ui'
import { TagInput } from '../components/TagInput'
import { Header } from '../components/Header'

type Draft = Pick<Entry, 'type' | 'title' | 'body' | 'tags' | 'goalIds' | 'occurredAt'>

const EMPTY: Draft = {
  type: '성과',
  title: '',
  body: '',
  tags: [],
  goalIds: [],
  occurredAt: today(),
}

export function EntryEdit() {
  const { id: routeId } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isNew = routeId === 'new'

  const [id, setId] = useState<string | null>(isNew ? null : (routeId ?? null))
  const [draft, setDraft] = useState<Draft>(() =>
    isNew
      ? {
          ...EMPTY,
          type: (params.get('type') as EntryType) ?? '성과',
          title: params.get('title') ?? '',
          body: params.get('body') ?? '',
        }
      : EMPTY,
  )
  const [loaded, setLoaded] = useState(isNew)
  // 회고 초안처럼 내용이 미리 채워진 채로 열려도, 손대기 전에는 저장하지 않습니다.
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [preview, setPreview] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? []
  const tags = useAllTags()

  // 기존 글 불러오기
  useEffect(() => {
    if (isNew || !routeId) return
    let alive = true
    void db.entries.get(routeId).then((found) => {
      if (!alive) return
      if (!found) return navigate('/entries', { replace: true })
      const { type, title, body, tags: t, goalIds, occurredAt } = found
      setDraft({ type, title, body, tags: t, goalIds: goalIds ?? [], occurredAt })
      setLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [isNew, routeId, navigate])

  // 본문 높이를 내용에 맞춤 (iOS에서 스크롤 두 겹이 생기는 걸 피합니다)
  useEffect(() => {
    const el = bodyRef.current
    if (!el || preview) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft.body, preview, loaded])

  // 자동 저장 — 저장 버튼은 없습니다
  useDebouncedEffect(
    () => {
      if (!loaded || !dirty) return
      const hasContent = draft.title.trim() || draft.body.trim()
      if (!hasContent && !id) return
      void (async () => {
        const now = Date.now()
        if (id) {
          await db.entries.update(id, { ...draft, updatedAt: now })
        } else {
          const fresh = newId()
          await db.entries.add({ id: fresh, ...draft, createdAt: now, updatedAt: now })
          setId(fresh)
          navigate(`/entry/${fresh}`, { replace: true })
        }
        setSavedAt(now)
      })()
    },
    [draft, loaded, dirty],
    500,
  )

  function patch(next: Partial<Draft>) {
    setDirty(true)
    setDraft((d) => ({ ...d, ...next }))
  }

  async function remove() {
    if (!id) return navigate(-1)
    if (!confirm('이 기록을 지울까요? 되돌릴 수 없습니다.')) return
    await db.entries.delete(id)
    navigate('/entries', { replace: true })
  }

  return (
    <>
      <Header
        title={isNew && !id ? '새 기록' : '기록'}
        back
        action={
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-400 dark:text-slate-500">
              {savedAt ? '저장됨' : dirty ? '입력 중' : ''}
            </span>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="text-[15px] font-medium text-blue-600 dark:text-blue-400"
            >
              {preview ? '편집' : '보기'}
            </button>
          </div>
        }
      />

      <div className="space-y-5 p-4">
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {ENTRY_TYPES.map((t) => (
            <Chip key={t} active={draft.type === t} onClick={() => patch({ type: t })}>
              {t}
            </Chip>
          ))}
        </div>

        <Input
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="제목"
          className="text-[19px] font-semibold"
          enterKeyHint="next"
        />

        {preview ? (
          <div
            className="prose-note min-h-40"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.body || '_본문이 비어 있습니다._') }}
          />
        ) : (
          <div>
            <Textarea
              ref={bodyRef}
              value={draft.body}
              onChange={(e) => patch({ body: e.target.value })}
              placeholder="무슨 일이 있었고, 내가 무엇을 했고, 결과가 어땠는지."
              className="min-h-40 overflow-hidden"
            />
            {!draft.body.trim() && draft.type === '성과' && (
              <Button className="mt-2" onClick={() => patch({ body: STAR_TEMPLATE })}>
                STAR 형식으로 시작
              </Button>
            )}
          </div>
        )}

        <div>
          <Label>날짜</Label>
          <Input
            type="date"
            value={draft.occurredAt}
            onChange={(e) => patch({ occurredAt: e.target.value || today() })}
          />
        </div>

        <div>
          <Label>태그</Label>
          <TagInput value={draft.tags} onChange={(t) => patch({ tags: t })} suggestions={tags} />
        </div>

        {goals.length > 0 && (
          <div>
            <Label>연결된 목표·스킬</Label>
            <div className="flex flex-wrap gap-1.5">
              {goals.map((g) => (
                <Chip
                  key={g.id}
                  active={draft.goalIds.includes(g.id)}
                  onClick={() =>
                    patch({
                      goalIds: draft.goalIds.includes(g.id)
                        ? draft.goalIds.filter((x) => x !== g.id)
                        : [...draft.goalIds, g.id],
                    })
                  }
                >
                  {g.title}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <Button variant="danger" className="w-full" onClick={() => void remove()}>
          삭제
        </Button>
      </div>
    </>
  )
}
