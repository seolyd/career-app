import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

const TABS: Array<{ to: string; label: string; icon: ReactNode }> = [
  { to: '/', label: '홈', icon: <Icon d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" /> },
  { to: '/entries', label: '기록', icon: <Icon d="M5 6h2M5 12h2M5 18h2M10 6h9M10 12h9M10 18h9" /> },
  { to: '/retro', label: '회고', icon: <Icon d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4M12 8v4l3 2" /> },
  { to: '/goals', label: '목표', icon: <Icon d="M12 21a9 9 0 1 0-9-9M12 16a4 4 0 1 0-4-4M12 12l9-9M15 3h6v6" /> },
  { to: '/resume', label: '문서', icon: <Icon d="M5 4h9l5 5v11H5zM14 4v5h5M9 13h6M9 17h4" /> },
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
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
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
