import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { db, seedIfEmpty } from './db'
import { setAskProfile } from './lib/ask'
import { Today } from './pages/Today'
import { Journal } from './pages/Journal'
import { EntryEdit } from './pages/EntryEdit'
import { Board } from './pages/Board'
import { Reading } from './pages/Reading'
import { Plan } from './pages/Plan'
import { Settings } from './pages/Settings'
import { Setup } from './pages/Setup'
import { BottomNav } from './components/BottomNav'
import { UpdatePrompt } from './components/UpdatePrompt'

const FULLSCREEN = ['/entry/', '/settings']

export function App() {
  const { pathname } = useLocation()
  const [ready, setReady] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const hideNav = FULLSCREEN.some((p) => pathname.startsWith(p))

  // 좌석과 페이즈 뼈대는 첫 실행에 한 번만 깔리고,
  // 프롬프트 페르소나는 기기에 저장된 프로필에서 읽어옵니다.
  useEffect(() => {
    void (async () => {
      await seedIfEmpty()
      const profile = await db.profile.get('profile')
      setAskProfile(profile ?? null)
      setNeedsSetup(!profile)
      setReady(true)
    })()
  }, [])

  if (!ready) return null
  if (needsSetup) return <Setup onDone={() => setNeedsSetup(false)} />

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <main className="flex-1 pb-6">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/entry/:id" element={<EntryEdit />} />
          <Route path="/board" element={<Board />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideNav && <BottomNav />}
      <UpdatePrompt />
    </div>
  )
}
