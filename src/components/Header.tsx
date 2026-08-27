import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export function Header({
  title,
  back,
  action,
}: {
  title: string
  back?: boolean
  action?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="safe-top sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 pb-3 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex min-h-9 items-center gap-2">
        {back && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로"
            className="-ml-1 p-1 text-blue-600 dark:text-blue-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        <h1 className="flex-1 truncate text-[19px] font-bold">{title}</h1>
        {action}
      </div>
    </header>
  )
}
