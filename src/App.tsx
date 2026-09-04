import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { seedIfEmpty } from './db'
import { Today } from './pages/Today'
import { Journal } from './pages/Journal'
import { EntryEdit } from './pages/EntryEdit'
import { Board } from './pages/Board'
import { Reading } from './pages/Reading'
import { Plan } from './pages/Plan'
import { Settings } from './pages/Settings'
import { BottomNav } from './components/BottomNav'
import { UpdatePrompt } from './components/UpdatePrompt'

const FULLSCREEN = ['/entry/', '/settings']

export function App() {
  const { pathname } = useLocation()
  const [ready, setReady] = useState(false)
  const hideNav = FULLSCREEN.some((p) => pathname.startsWith(p))

  // 좌석과 플래너 초안은 첫 실행에 한 번만 깔립니다
  useEffect(() => {
    void seedIfEmpty().finally(() => setReady(true))
  }, [])

  if (!ready) return null

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
