import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-4 bottom-24 z-30 flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
      <span className="flex-1 text-[14px]">A new version is available.</span>
      <button
        type="button"
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white"
        onClick={() => void updateServiceWorker(true)}
      >
        Update
      </button>
      <button
        type="button"
        className="text-[13px] opacity-60"
        onClick={() => setNeedRefresh(false)}
      >
        Later
      </button>
    </div>
  )
}
