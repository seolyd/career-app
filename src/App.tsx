import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { db, seedIfEmpty } from './db'
import { setAskProfile } from './lib/ask'
import { Today } from './pages/Today'
import { Journal } from './pages/Journal'
import { EntryEdit } from './pages/EntryEdit'
import { Board } from './pages/Board'
import { Feed } from './pages/Feed'
import { Plan } from './pages/Plan'
import { Settings } from './pages/Settings'
import { BottomNav } from './components/BottomNav'
import { UpdatePrompt } from './components/UpdatePrompt'

const FULLSCREEN = ['/entry/', '/settings']

export function App() {
  const { pathname } = useLocation()
  const [ready, setReady] = useState(false)
  const hideNav = FULLSCREEN.some((p) => pathname.startsWith(p))

  // 좌석·페이즈·프로필 뼈대는 첫 실행에 한 번만 깔립니다. 아무것도 묻지 않고
  // 바로 쓸 수 있어야 해서, 프롬프트 페르소나도 기본값으로 시작해 설정에서 고칩니다.
  useEffect(() => {
    void (async () => {
      await seedIfEmpty()
      setAskProfile((await db.profile.get('profile')) ?? null)
      setReady(true)
      // iOS가 저장소를 비워버리면 기록이 통째로 날아갑니다. 조용히 한 번 요청해 둡니다.
      void navigator.storage?.persist?.().catch(() => {})
    })()
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
          <Route path="/pm" element={<Feed section="pm" />} />
          <Route path="/ai" element={<Feed section="ai" />} />
          {/* 홈화면에 저장된 옛 주소가 깨지지 않게 남겨둡니다 */}
          <Route path="/reading" element={<Navigate to="/pm" replace />} />
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
