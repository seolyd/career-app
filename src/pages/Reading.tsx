import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db, newId } from '../db'
import { relativeKo, today } from '../lib/date'
import { askDigest, type Draft } from '../lib/ask'
import { FEED_GROUPS, GROUP_LABEL, loadFeed, type FeedFile, type FeedGroup, type FeedItem } from '../lib/feed'
import { Button, Card, Chip, Input, Label, SectionTitle, Textarea } from '../components/ui'
import { EntryCard } from '../components/EntryCard'
import { Header } from '../components/Header'
import { AskButton, AskSheet } from '../components/AskSheet'

interface DigestReply {
  summary?: string
  soWhat?: string
}

export function Reading() {
  const navigate = useNavigate()
  const [feed, setFeed] = useState<FeedFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<FeedGroup | null>(null)
  const [hideRead, setHideRead] = useState(true)
  const [manual, setManual] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [ask, setAsk] = useState<Draft | null>(null)

  const states = useLiveQuery(() => db.feedStates.toArray(), []) ?? []
  const readIds = useMemo(() => new Set(states.map((s) => s.feedItemId)), [states])
  const inputs = useLiveQuery(() => db.entries.where('type').equals('Input').reverse().sortBy('occurredAt'), []) ?? []

  useEffect(() => {
    void loadFeed().then((f) => {
      setFeed(f)
      setLoading(false)
    })
  }, [])

  const items = (feed?.items ?? []).filter((i) => {
    if (group && i.group !== group) return false
    if (hideRead && readIds.has(i.id)) return false
    return true
  })
  const unreadCount = (feed?.items ?? []).filter((i) => !readIds.has(i.id)).length
  const failed = feed?.report?.failed ?? []

  async function saveInput(fields: { title: string; url: string; body: string; soWhat?: string; feedItemId?: string }) {
    if (!fields.title.trim()) return null
    const now = Date.now()
    const id = newId()
    await db.entries.add({
      id,
      type: 'Input',
      title: fields.title.trim(),
      body: fields.body,
      axis: 'Product Sense',
      tags: [],
      occurredAt: today(),
      createdAt: now,
      updatedAt: now,
      sourceUrl: fields.url.trim() || undefined,
      soWhat: fields.soWhat,
    })
    if (fields.feedItemId) {
      await db.feedStates.put({ feedItemId: fields.feedItemId, readAt: now, entryId: id })
    }
    return id
  }

  return (
    <>
      <Header
        title="Reading"
        action={
          <button
            type="button"
            onClick={() => setManual((v) => !v)}
            className="px-2 py-1 text-[15px] font-semibold text-blue-600 dark:text-blue-400"
          >
            {manual ? 'Close' : 'Add'}
          </button>
        }
      />

      <div className="space-y-6 p-4">
        {manual && (
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
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What stuck with you." />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                className="flex-1"
                disabled={!title.trim()}
                onClick={async () => {
                  const id = await saveInput({ title, url, body: note })
                  setTitle(''); setUrl(''); setNote(''); setManual(false)
                  if (id) navigate(`/entry/${id}`)
                }}
              >
                Save as Input
              </Button>
              <AskButton label="Let the LLM digest it" onClick={() => title.trim() && setAsk(askDigest(title, url, note))} />
            </div>
          </Card>
        )}

        <section className="space-y-3">
          <SectionTitle>
            {loading ? 'Loading feed' : feed ? `Feed · ${unreadCount} unread` : 'Feed not published yet'}
          </SectionTitle>

          {!loading && !feed && (
            <Card>
              <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">
                No <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">feed.json</code> yet. The
                “Refresh feed” Action writes it every morning once this is deployed — or run{' '}
                <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run feed</code> locally.
                Until then, use Add above to log anything you read.
              </p>
            </Card>
          )}

          {feed && (
            <>
              <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                <Chip active={group === null} onClick={() => setGroup(null)}>All</Chip>
                {FEED_GROUPS.map((g) => (
                  <Chip key={g} active={group === g} onClick={() => setGroup(group === g ? null : g)}>
                    {GROUP_LABEL[g]}
                  </Chip>
                ))}
                <Chip active={hideRead} onClick={() => setHideRead(!hideRead)}>Unread only</Chip>
              </div>

              {items.length ? (
                <div className="space-y-2">
                  {items.slice(0, 40).map((item) => (
                    <FeedCard
                      key={item.id}
                      item={item}
                      read={readIds.has(item.id)}
                      onOpen={() => void db.feedStates.put({ feedItemId: item.id, readAt: Date.now() })}
                      onLog={async () => {
                        const id = await saveInput({
                          title: item.title,
                          url: item.url,
                          body: item.excerpt,
                          feedItemId: item.id,
                        })
                        if (id) navigate(`/entry/${id}`)
                      }}
                      onDigest={() => setAsk(askDigest(item.title, item.url, ''))}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <p className="text-[14px] text-slate-500 dark:text-slate-400">
                    {hideRead ? 'Nothing unread. One a day is enough.' : 'Nothing in this group yet.'}
                  </p>
                </Card>
              )}

              <p className="text-[12px] text-slate-400 dark:text-slate-500">
                Updated {relativeKo(feed.generatedAt.slice(0, 10))}
                {failed.length > 0 && ` · ${failed.length} source${failed.length > 1 ? 's' : ''} failing: ${failed.map((f) => f.id).join(', ')}`}
              </p>
            </>
          )}
        </section>

        <section>
          <SectionTitle>Logged · {inputs.length}</SectionTitle>
          {inputs.length ? (
            <div className="space-y-2">
              {inputs.slice(0, 20).map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-[14px] text-slate-500 dark:text-slate-400">
                Nothing logged yet. Reading without a note is consumption, not digestion.
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
          const source = feed?.items.find((i) => ask?.title.endsWith(i.title))
          const id = await saveInput({
            title: source?.title ?? title,
            url: source?.url ?? url,
            body: d.summary ?? reply,
            soWhat: d.soWhat,
            feedItemId: source?.id,
          })
          setTitle(''); setUrl(''); setNote(''); setManual(false)
          if (id) navigate(`/entry/${id}`)
        }}
      />
    </>
  )
}

function FeedCard({
  item,
  read,
  onOpen,
  onLog,
  onDigest,
}: {
  item: FeedItem
  read: boolean
  onOpen: () => void
  onLog: () => void
  onDigest: () => void
}) {
  return (
    <Card className={read ? 'opacity-60' : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {item.sourceName}
        </span>
        <span className="text-[12px] text-slate-400 dark:text-slate-500">
          {relativeKo(item.publishedAt.slice(0, 10))}
        </span>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer noopener"
        onClick={onOpen}
        className="mt-1.5 block font-semibold text-slate-900 dark:text-slate-100"
      >
        {item.title}
      </a>
      {item.excerpt && (
        <p className="mt-1 line-clamp-3 text-[14px] text-slate-500 dark:text-slate-400">{item.excerpt}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="flex-1" onClick={onLog}>Log with a note</Button>
        <AskButton label="Digest" onClick={onDigest} />
      </div>
    </Card>
  )
}
