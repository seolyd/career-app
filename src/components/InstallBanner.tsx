import { useEffect, useState } from 'react'

const DISMISS_KEY = 'career-app:install-dismissed'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

function isIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/**
 * iOS Safari에는 설치 프롬프트 API가 없습니다. 공유 시트를 직접 안내하는 수밖에 없고,
 * 홈 화면에 추가해야 IndexedDB가 안정적으로 남고 알림도 쓸 수 있습니다.
 */
export function InstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (!isIOS()) return
    if (localStorage.getItem(DISMISS_KEY)) return
    setShow(true)
  }, [])

  if (!show) return null

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-900 dark:bg-blue-950/50">
      <p className="text-[14px] leading-6 text-blue-900 dark:text-blue-200">
        <strong className="font-semibold">홈 화면에 추가하세요.</strong> Safari 하단{' '}
        <span className="font-semibold">공유</span> → <span className="font-semibold">홈 화면에 추가</span>.
        설치하지 않으면 오래 안 쓸 때 Safari가 기록을 지울 수 있습니다.
      </p>
      <button
        type="button"
        className="mt-2 text-[13px] font-medium text-blue-700 underline dark:text-blue-300"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1')
          setShow(false)
        }}
      >
        다시 보지 않기
      </button>
    </div>
  )
}
