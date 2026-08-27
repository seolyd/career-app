import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Home } from './pages/Home'
import { Entries } from './pages/Entries'
import { EntryEdit } from './pages/EntryEdit'
import { Retro } from './pages/Retro'
import { Goals } from './pages/Goals'
import { Resume } from './pages/Resume'
import { Settings } from './pages/Settings'
import { BottomNav } from './components/BottomNav'
import { UpdatePrompt } from './components/UpdatePrompt'

const FULLSCREEN = ['/entry/', '/settings']

export function App() {
  const { pathname } = useLocation()
  const hideNav = FULLSCREEN.some((p) => pathname.startsWith(p))

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <main className="flex-1 pb-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/entries" element={<Entries />} />
          <Route path="/entry/:id" element={<EntryEdit />} />
          <Route path="/retro" element={<Retro />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideNav && <BottomNav />}
      <UpdatePrompt />
    </div>
  )
}
