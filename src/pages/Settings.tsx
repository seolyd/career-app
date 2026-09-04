import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { buildBackup, downloadJSON, estimateStorage, importBackup } from '../lib/backup'
import { loadRedactions, saveRedactions, setAskProfile, type Redaction } from '../lib/ask'
import { isoFromTs, relativeKo } from '../lib/date'
import { Button, Card, Input, Label, SectionTitle, Textarea } from '../components/ui'
import { Header } from '../components/Header'

export function Settings() {
  const [usage, setUsage] = useState('…')
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [redactions, setRedactions] = useState<Redaction[]>(() => loadRedactions())
  const fileRef = useRef<HTMLInputElement>(null)

  const counts = useLiveQuery(async () => ({
    entries: await db.entries.count(),
    weekGoals: await db.weekGoals.count(),
    sessions: await db.sessions.count(),
    asks: await db.asks.count(),
  }))
  const recentAsks = useLiveQuery(() => db.asks.orderBy('createdAt').reverse().limit(8).toArray(), []) ?? []
  const profile = useLiveQuery(() => db.profile.get('profile'), [])

  async function patchProfile(next: Partial<{ role: string; context: string; situation: string }>) {
    const updated = {
      id: 'profile' as const,
      role: profile?.role ?? '',
      context: profile?.context ?? '',
      situation: profile?.situation ?? '',
      ...next,
      updatedAt: Date.now(),
    }
    await db.profile.put(updated)
    setAskProfile(updated)
  }

  useEffect(() => {
    void estimateStorage().then(setUsage)
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  function updateRedactions(next: Redaction[]) {
    setRedactions(next)
    saveRedactions(next.filter((r) => r.from.trim()))
  }

  async function onFile(file: File) {
    try {
      const result = await importBackup(await file.text())
      setMessage(
        `Restored ${result.restored} items.` +
          (result.skipped ? ` (skipped ${result.skipped} malformed)` : ''),
      )
      void estimateStorage().then(setUsage)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  async function requestPersist() {
    const ok = await navigator.storage?.persist?.()
    setPersisted(ok ?? false)
    setMessage(
      ok
        ? 'Storage is now persisted on this device.'
        : 'The browser declined. Adding to the Home Screen and opening it often improves the odds.',
    )
  }

  async function wipe() {
    if (!confirm('This deletes every entry. Without a backup it cannot be recovered. Continue?')) return
    if (!confirm('Really delete everything?')) return
    await db.delete()
    location.reload()
  }

  return (
    <>
      <Header title="Settings" back />

      <div className="space-y-6 p-4">
        {message && (
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-[14px] text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
            {message}
          </div>
        )}

        {/* 프롬프트 페르소나 — 코드가 아니라 기기에 있습니다 */}
        <section>
          <SectionTitle>Who the LLM is answering</SectionTitle>
          <Card className="space-y-3">
            <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">
              Every prompt this app builds opens with this. It lives on this device only — not in the
              deployed code — so nobody with the URL can read it. It is included in backups.
            </p>
            <div>
              <Label>Your role</Label>
              <Textarea
                rows={2}
                value={profile?.role ?? ''}
                onChange={(e) => void patchProfile({ role: e.target.value })}
                placeholder="a product manager responsible for …"
              />
            </div>
            <div>
              <Label>Company and product context</Label>
              <Textarea
                rows={3}
                value={profile?.context ?? ''}
                onChange={(e) => void patchProfile({ context: e.target.value })}
                placeholder="Where you work, what the product is, what stage it is at."
              />
            </div>
            <div>
              <Label>Anything else it should know</Label>
              <Textarea
                rows={4}
                value={profile?.situation ?? ''}
                onChange={(e) => void patchProfile({ situation: e.target.value })}
                placeholder="Team size, constraints, what occupies you, your background."
              />
            </div>
          </Card>
        </section>

        {/* LLM으로 나가는 내용 치환 */}
        <section>
          <SectionTitle>Redactions before sending</SectionTitle>
          <Card className="space-y-3">
            <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">
              Swap proper nouns right before a prompt leaves the app. Register internal system names or people once and stop thinking about it.
            </p>
            {redactions.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="min-w-0 flex-1"
                  value={r.from}
                  placeholder="Original"
                  onChange={(e) =>
                    updateRedactions(redactions.map((x, j) => (i === j ? { ...x, from: e.target.value } : x)))
                  }
                />
                <span className="shrink-0 text-slate-400">→</span>
                <Input
                  className="min-w-0 flex-1"
                  value={r.to}
                  placeholder="Replace with"
                  onChange={(e) =>
                    updateRedactions(redactions.map((x, j) => (i === j ? { ...x, to: e.target.value } : x)))
                  }
                />
                <button
                  type="button"
                  aria-label="Remove rule"
                  onClick={() => updateRedactions(redactions.filter((_, j) => j !== i))}
                  className="shrink-0 p-1 text-slate-300 dark:text-slate-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
            <Button className="w-full" onClick={() => updateRedactions([...redactions, { from: '', to: '' }])}>
              Add a rule
            </Button>
            <p className="text-[12px] text-slate-400 dark:text-slate-500">
              Rules stay on this device and are not included in backups.
            </p>
          </Card>
        </section>

        {/* 주고받은 프롬프트 이력 */}
        <section>
          <SectionTitle>LLM round-trips · {counts?.asks ?? 0}</SectionTitle>
          <Card>
            {recentAsks.length ? (
              <div className="space-y-2.5">
                {recentAsks.map((a) => (
                  <div key={a.id} className="flex items-baseline gap-2">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                        a.status === 'Answered'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {a.status}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">{a.title}</span>
                    <span className="shrink-0 text-[12px] text-slate-400 dark:text-slate-500">
                      {relativeKo(isoFromTs(a.createdAt))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-slate-500 dark:text-slate-400">Nothing yet.</p>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>Backup</SectionTitle>
          <Card className="space-y-3">
            <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">
              There is no server. Everything lives on this device only. Clear the browser storage or lose the phone and it is gone — export now and then, and keep the file somewhere like iCloud Drive.
            </p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={async () =>
                  downloadJSON(await buildBackup(), `career-backup-${new Date().toISOString().slice(0, 10)}.json`)
                }
              >
                Export JSON
              </Button>
              <Button className="flex-1" onClick={() => fileRef.current?.click()}>
                Import
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onFile(file)
                e.target.value = ''
              }}
            />
            <p className="text-[13px] text-slate-400 dark:text-slate-500">
              Import merges rather than overwrites. For the same item, the more recently edited version wins.
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>Storage</SectionTitle>
          <Card className="space-y-3">
            <dl className="space-y-1.5 text-[14px]">
              <Row label="Entries" value={String(counts?.entries ?? 0)} />
              <Row label="Weekly goals" value={String(counts?.weekGoals ?? 0)} />
              <Row label="Board sessions" value={String(counts?.sessions ?? 0)} />
              <Row label="Used" value={usage} />
              <Row label="Storage persisted" value={persisted === null ? 'Checking' : persisted ? 'On' : 'Off'} />
            </dl>
            {!persisted && (
              <Button className="w-full" onClick={() => void requestPersist()}>
                Request persistent storage
              </Button>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>Install on iPhone</SectionTitle>
          <Card>
            <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-6 text-slate-600 dark:text-slate-300">
              <li>Open this URL in Safari.</li>
              <li>Tap the Share button.</li>
              <li>Choose Add to Home Screen.</li>
            </ol>
            <p className="mt-3 text-[13px] text-slate-400 dark:text-slate-500">
              Installing gives you full screen without an address bar, and lowers the risk of storage being cleared.
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>Danger zone</SectionTitle>
          <Button variant="danger" className="w-full" onClick={() => void wipe()}>
            Delete everything
          </Button>
        </section>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
