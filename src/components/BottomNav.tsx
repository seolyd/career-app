import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const TABS: Array<{ to: string; label: string; icon: ReactNode }> = [
  { to: '/', label: 'Today', icon: <Icon d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" /> },
  { to: '/journal', label: 'Journal', icon: <Icon d="M5 6h2M5 12h2M5 18h2M10 6h9M10 12h9M10 18h9" /> },
  { to: '/board', label: 'Board', icon: <Icon d="M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6M5 20a7 7 0 0 1 14 0M4 11a2.5 2.5 0 1 1 0-5M20 11a2.5 2.5 0 1 0 0-5" /> },
  { to: '/reading', label: 'Reading', icon: <Icon d="M12 6.5S9.5 4.5 4 5v13c5.5-.5 8 1.5 8 1.5s2.5-2 8-1.5V5c-5.5-.5-8 1.5-8 1.5zM12 6.5v13" /> },
  { to: '/plan', label: 'Plan', icon: <Icon d="M4 20V8M10 20V4M16 20v-7M22 20H2" /> },
]

export function BottomNav() {
  return (
    <nav className="safe-bottom sticky bottom-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/90">
      <ul className="flex">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                }`
              }
            >
              {tab.icon}
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
