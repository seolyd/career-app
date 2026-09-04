import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db, newId } from '../db'
import { today } from '../lib/date'
import { askDigest, type Draft } from '../lib/ask'
import { Button, Card, Input, Label, SectionTitle, Textarea } from '../components/ui'
import { EntryCard } from '../components/EntryCard'
import { Header } from '../components/Header'
import { AskButton, AskSheet } from '../components/AskSheet'

interface DigestReply {
  summary?: string
  soWhat?: string
}

const SOURCES = [
  { group: 'PM gurus', names: 'SVPG(Cagan) · Product Talk(Torres) · The Beautiful Mess(Cutler) · Lenny · Bring the Donuts(Norton) · Gibson Biddle' },
  { group: 'HR tech', names: 'Josh Bersin · HR tech vendor blogs and release notes' },
  { group: 'PM · AI', names: 'AI product design and eval writing · internal-tooling case studies' },
]

export function Reading() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [ask, setAsk] = useState<Draft | null>(null)

  const inputs = useLiveQuery(
    () => db.entries.where('type').equals('Input').reverse().sortBy('occurredAt'),
    [],
  ) ?? []

  async function save(extra?: { body?: string; soWhat?: string }) {
    if (!title.trim()) return null
    const now = Date.now()
    const id = newId()
    await db.entries.add({
      id,
      type: 'Input',
      title: title.trim(),
      body: extra?.body ?? note.trim(),
      axis: 'Product Sense',
      tags: [],
      occurredAt: today(),
      createdAt: now,
      updatedAt: now,
      sourceUrl: url.trim() || undefined,
      soWhat: extra?.soWhat,
    })
    setTitle('')
    setUrl('')
    setNote('')
    return id
  }

  return (
    <>
      <Header title="Reading" />

      <div className="space-y-6 p-4">
        <Card>
          <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">
            The automatic feed lands <strong>once this is deployed</strong>. A GitHub Action refreshes <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">public/feed.json</code> every morning; this list fills in, and a guru's new post also badges their seat on the Board.
          </p>
          <div className="mt-3 space-y-1.5">
            {SOURCES.map((s) => (
              <p key={s.group} className="text-[13px] text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">{s.group}</span> — {s.names}
              </p>
            ))}
          </div>
        </Card>

        <section>
          <SectionTitle>Log something you just read</SectionTitle>
          <Card className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" />
            </div>
            <div>
              <Label>Link</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" />
            </div>
            <div>
              <Label>One-line note</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What stuck with you. You can leave the summary to the LLM." />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                className="flex-1"
                disabled={!title.trim()}
                onClick={async () => {
                  const id = await save()
                  if (id) navigate(`/entry/${id}`)
                }}
              >
                Save as Input
              </Button>
              <AskButton
                label="Let the LLM digest it"
                onClick={() => title.trim() && setAsk(askDigest(title, url, note))}
              />
            </div>
            <p className="text-[12px] text-slate-400 dark:text-slate-500">
              The app does not translate. Hand it to the LLM and you get back a summary plus one "So I will" sentence.
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>Read · {inputs.length}</SectionTitle>
          {inputs.length ? (
            <div className="space-y-2">
              {inputs.slice(0, 30).map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-[14px] text-slate-500 dark:text-slate-400">
                Nothing yet. One a day is enough, and unread pieces do not pile up.
              </p>
            </Card>
          )}
        </section>
      </div>

      <AskSheet
        draft={ask}
        onClose={() => setAsk(null)}
        onResult={async (reply, parsed) => {
          const d = (parsed ?? {}) as DigestReply
          const id = await save({ body: d.summary ?? reply, soWhat: d.soWhat })
          if (id) navigate(`/entry/${id}`)
        }}
      />
    </>
  )
}
