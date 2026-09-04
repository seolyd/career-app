import { useState } from 'react'
import { db } from '../db'
import type { Profile } from '../types'
import { setAskProfile } from '../lib/ask'
import { Button, Card, Label, Textarea } from '../components/ui'

/**
 * 첫 실행에 한 번만 뜹니다. 여기서 받은 내용은 IndexedDB에만 저장되고
 * 배포된 번들에는 들어가지 않습니다 — 주소를 아는 사람도 읽을 수 없습니다.
 */
export function Setup({ onDone }: { onDone: () => void }) {
  const [role, setRole] = useState('')
  const [context, setContext] = useState('')
  const [situation, setSituation] = useState('')
  const [vision, setVision] = useState('')
  const [why, setWhy] = useState('')
  const [saving, setSaving] = useState(false)

  const ready = role.trim().length > 0

  async function save() {
    setSaving(true)
    const now = Date.now()
    const profile: Profile = {
      id: 'profile',
      role: role.trim(),
      context: context.trim(),
      situation: situation.trim(),
      updatedAt: now,
    }
    await db.profile.put(profile)
    if (vision.trim() || why.trim()) {
      await db.vision.put({ id: 'vision', text: vision.trim(), why: why.trim(), updatedAt: now })
    }
    setAskProfile(profile)
    onDone()
  }

  return (
    <div className="safe-top mx-auto max-w-2xl space-y-6 p-5 pb-16">
      <header className="pt-6">
        <h1 className="text-[26px] leading-tight font-bold">Set this up once</h1>
        <p className="mt-2 text-[15px] leading-7 text-slate-500 dark:text-slate-400">
          Everything below stays on this phone. It never leaves the device except inside a prompt you
          copy yourself, and it is not part of the deployed code — so nobody with the URL can read it.
        </p>
      </header>

      <Card className="space-y-4">
        <h2 className="text-[15px] font-bold">Who the LLM is answering</h2>
        <p className="-mt-2 text-[13px] leading-6 text-slate-500 dark:text-slate-400">
          Every prompt this app builds opens with this. The more specific it is, the less generic the
          advice comes back.
        </p>
        <div>
          <Label>Your role · required</Label>
          <Textarea
            rows={2}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="a product manager responsible for HR products — recruiting and people platforms, and the AI features on top of them"
            autoFocus
          />
        </div>
        <div>
          <Label>Company and product context</Label>
          <Textarea
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Where you work, what the product is, what stage it is at."
          />
        </div>
        <div>
          <Label>Anything else it should know</Label>
          <Textarea
            rows={4}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Team size, constraints, what occupies you right now, your background. Write it as sentences — it goes into the prompt as-is."
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-[15px] font-bold">Ten-year vision · optional</h2>
        <p className="-mt-2 text-[13px] leading-6 text-slate-500 dark:text-slate-400">
          One sentence is enough, and you will rewrite it. Skip it if nothing comes — the Plan tab
          asks again.
        </p>
        <div>
          <Label>Where you want to stand in ten years</Label>
          <Textarea rows={2} value={vision} onChange={(e) => setVision(e.target.value)} placeholder="One sentence." />
        </div>
        <div>
          <Label>Why</Label>
          <Textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="What makes that the destination." />
        </div>
      </Card>

      <div className="space-y-2">
        <Button variant="primary" className="w-full" disabled={!ready || saving} onClick={() => void save()}>
          {saving ? 'Saving' : 'Start'}
        </Button>
        <p className="text-center text-[12px] text-slate-400 dark:text-slate-500">
          You can change all of this later in Settings.
        </p>
      </div>
    </div>
  )
}
