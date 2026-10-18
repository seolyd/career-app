import { FEED_LANGS, LANG_SHORT, type FeedLang } from '../lib/feed'

/**
 * 헤더 오른쪽의 한글/영문 전환. 국내 글이 기본이고, 한 번 누르면 영문으로 넘어갑니다.
 *
 * 번역이 아니라 어느 소스를 볼지 고르는 버튼입니다 — 같은 글을 번역해 보여주지
 * 않고, 국내 발행처와 해외 발행처를 갈라 보여줍니다.
 */
export function LangToggle({
  value,
  onChange,
  counts,
}: {
  value: FeedLang
  onChange: (lang: FeedLang) => void
  /** 각 언어에 안 읽은 글이 몇 개인지 — 0이면 눌러도 빈 목록이라 미리 알려줍니다 */
  counts?: Record<FeedLang, number>
}) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="글 언어">
      {FEED_LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={value === l}
          className={`rounded-md px-2.5 py-1 text-[15px] font-semibold whitespace-nowrap ${
            value === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          {LANG_SHORT[l]}
          {counts && counts[l] === 0 && <span className="ml-1 font-normal text-slate-400">0</span>}
        </button>
      ))}
    </div>
  )
}
