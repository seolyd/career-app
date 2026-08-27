import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { buildBackup, downloadJSON, estimateStorage, importBackup } from '../lib/backup'
import { Button, Card, SectionTitle } from '../components/ui'
import { Header } from '../components/Header'

export function Settings() {
  const [usage, setUsage] = useState('…')
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const counts = useLiveQuery(async () => ({
    entries: await db.entries.count(),
    goals: await db.goals.count(),
  }))

  useEffect(() => {
    void estimateStorage().then(setUsage)
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  async function exportBackup() {
    const data = await buildBackup()
    downloadJSON(data, `career-backup-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function onFile(file: File) {
    try {
      const result = await importBackup(await file.text())
      setMessage(
        `기록 ${result.entries}건, 목표 ${result.goals}건을 넣었습니다.` +
          (result.skipped ? ` (형식이 안 맞는 ${result.skipped}건은 건너뜀)` : ''),
      )
      void estimateStorage().then(setUsage)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '가져오기에 실패했습니다.')
    }
  }

  async function requestPersist() {
    const ok = await navigator.storage?.persist?.()
    setPersisted(ok ?? false)
    setMessage(
      ok
        ? '이 기기에서 저장소가 보호됩니다.'
        : '브라우저가 거절했습니다. 홈 화면에 추가하고 자주 열면 유지 확률이 올라갑니다.',
    )
  }

  async function wipe() {
    if (!confirm('모든 기록과 목표를 지웁니다. 백업이 없으면 복구할 수 없습니다. 계속할까요?')) return
    if (!confirm('정말로 전부 지울까요?')) return
    await db.transaction('rw', db.entries, db.goals, async () => {
      await db.entries.clear()
      await db.goals.clear()
    })
    setMessage('전부 지웠습니다.')
  }

  return (
    <>
      <Header title="설정" back />

      <div className="space-y-6 p-4">
        {message && (
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-[14px] text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
            {message}
          </div>
        )}

        <section>
          <SectionTitle>백업</SectionTitle>
          <Card className="space-y-3">
            <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">
              이 앱은 서버가 없습니다. 모든 기록은 이 기기 안에만 있습니다. 브라우저 저장소를 비우거나
              기기를 잃으면 그대로 사라지니, 가끔 내보내서 iCloud Drive 같은 곳에 두세요.
            </p>
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1" onClick={() => void exportBackup()}>
                JSON 내보내기
              </Button>
              <Button className="flex-1" onClick={() => fileRef.current?.click()}>
                가져오기
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
              가져오기는 덮어쓰지 않고 병합합니다. 같은 항목은 더 최근에 고친 쪽이 남습니다.
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>저장소</SectionTitle>
          <Card className="space-y-3">
            <dl className="space-y-1.5 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">기록</dt>
                <dd className="tabular-nums">{counts?.entries ?? 0}건</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">목표·스킬</dt>
                <dd className="tabular-nums">{counts?.goals ?? 0}건</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">사용량</dt>
                <dd className="tabular-nums">{usage}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">저장소 보호</dt>
                <dd>{persisted === null ? '확인 중' : persisted ? '켜짐' : '꺼짐'}</dd>
              </div>
            </dl>
            {!persisted && (
              <Button className="w-full" onClick={() => void requestPersist()}>
                저장소 보호 요청
              </Button>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>아이폰에 설치</SectionTitle>
          <Card>
            <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-6 text-slate-600 dark:text-slate-300">
              <li>Safari로 이 주소를 엽니다.</li>
              <li>하단 공유 버튼을 누릅니다.</li>
              <li>홈 화면에 추가를 고릅니다.</li>
            </ol>
            <p className="mt-3 text-[13px] text-slate-400 dark:text-slate-500">
              설치하면 주소창 없이 전체 화면으로 열리고, 저장소가 지워질 위험이 줄어듭니다.
            </p>
          </Card>
        </section>

        <section>
          <SectionTitle>위험 구역</SectionTitle>
          <Button variant="danger" className="w-full" onClick={() => void wipe()}>
            모든 데이터 삭제
          </Button>
        </section>
      </div>
    </>
  )
}
