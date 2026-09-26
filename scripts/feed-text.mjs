/**
 * fetch-feed.mjs와 youtube-channel.mjs가 같이 쓰는 문자열 손질기입니다.
 */

/**
 * 엔티티를 먼저 풀고 나서 태그를 벗깁니다. 순서가 중요합니다 — 팟캐스트 쇼노트는
 * 보통 HTML을 &lt;p&gt; 형태로 escape해서 보내는데, 태그부터 벗기면 그게 그대로 남습니다.
 * &amp;만 마지막에 푸는 이유는 &amp;lt;가 태그로 되살아나는 걸 막기 위해서입니다.
 */
export function stripHtml(s) {
  return String(s ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, '\u2019')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export function excerpt(s, max = 220) {
  const flat = stripHtml(s)
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

/** itunes:duration은 "3600" · "45:30" · "1:02:03" 세 형태로 옵니다. */
export function parseDuration(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return undefined
  if (/^\d+$/.test(raw)) return Number(raw)
  const parts = raw.split(':').map((p) => Number(p.trim()))
  if (!parts.length || parts.some((p) => !Number.isFinite(p))) return undefined
  const sec = parts.reduce((acc, p) => acc * 60 + p, 0)
  return sec > 0 ? Math.round(sec) : undefined
}
