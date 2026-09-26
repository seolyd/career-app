/**
 * 유튜브 채널의 최신 영상을 채널 페이지에서 읽습니다.
 *
 * 채널 RSS(youtube.com/feeds/videos.xml)를 쓰지 않는 이유: GitHub 러너에서 404를 냅니다.
 * 채널 다섯 개, 세 시각에 걸쳐 확인했고 채널 페이지 자체는 200이 나옵니다. 그래서
 * 페이지에 박혀 오는 ytInitialData를 읽습니다. 키도 할당량도 없지만, 유튜브가 페이지
 * 구조를 바꾸면 깨집니다 — 깨져도 이 소스만 report에 실패로 남고 나머지는 갱신됩니다.
 */
import { stripHtml, excerpt, parseDuration } from './feed-text.mjs'

/** 유튜브 채널 페이지인가. RSS(feeds/videos.xml)는 러너에서 404라 쓰지 않습니다. */
export function isYouTubeChannel(url) {
  return /^https?:\/\/(www\.)?youtube\.com\/(@|channel\/|c\/|user\/)/i.test(url)
}

/**
 * "3 days ago" 같은 상대 시각을 절대 시각으로 되돌립니다. 채널 페이지는 이것만 줍니다.
 * accept-language를 영어로 고정해서 파싱할 문자열을 하나로 묶어둡니다.
 */
function fromRelativeTime(text, now) {
  const m = /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i.exec(String(text ?? ''))
  if (!m) return undefined
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  const ms = {
    second: 1000,
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
    month: 2_592_000_000,
    year: 31_536_000_000,
  }[unit]
  return new Date(now - n * ms)
}

/** "1.2M views" · "12K views" · "731 views" */
function parseViews(text) {
  const m = /([\d.,]+)\s*([KMB])?\s*views?/i.exec(String(text ?? ''))
  if (!m) return undefined
  const n = Number(m[1].replace(/,/g, ''))
  if (!Number.isFinite(n)) return undefined
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[String(m[2] ?? '').toLowerCase()] ?? 1
  return Math.round(n * mult)
}

/**
 * ytInitialData 안에서 videoId를 가진 객체를 모두 끌어올립니다. 경로(richItemRenderer
 * → content → videoRenderer)로 찾아 들어가면 유튜브가 한 겹 끼울 때마다 깨지므로,
 * 모양으로 찾습니다. 순서는 페이지 순서 = 최신순 그대로입니다.
 */
function collectVideos(node, out = [], seen = new Set()) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const v of node) collectVideos(v, out, seen)
    return out
  }
  const id = typeof node.videoId === 'string' ? node.videoId : undefined
  const title = node.title?.runs?.[0]?.text ?? node.title?.simpleText
  if (id && title && !seen.has(id)) {
    seen.add(id)
    out.push(node)
  }
  for (const v of Object.values(node)) collectVideos(v, out, seen)
  return out
}

export function readYouTubeChannel(html, now = Date.now()) {
  const raw = /ytInitialData"?\s*[=:]\s*(\{.+?\})\s*;\s*(?:<\/script>|var |window\.)/s.exec(html)?.[1]
  let data
  try {
    data = JSON.parse(raw ?? '')
  } catch {
    // 스크립트 태그 전체를 범위로 잡고 마지막 중괄호까지 다시 시도합니다.
    const alt = html.slice(html.indexOf('ytInitialData'))
    const start = alt.indexOf('{')
    const end = alt.lastIndexOf('};')
    if (start < 0 || end < 0) throw new Error('ytInitialData를 찾지 못했습니다')
    data = JSON.parse(alt.slice(start, end + 1))
  }
  const found = collectVideos(data)
  return found
    .map((v, i) => {
      const published = fromRelativeTime(
        v.publishedTimeText?.simpleText ?? v.publishedTimeText?.runs?.[0]?.text,
        now,
      )
      // 같은 "2 weeks ago"가 여러 개일 때 페이지 순서를 정렬에서 잃지 않도록 1분씩 벌립니다.
      if (published) published.setTime(published.getTime() - i * 60_000)
      return {
        title: stripHtml(v.title?.runs?.[0]?.text ?? v.title?.simpleText),
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        uid: v.videoId,
        // 예정된 방송에는 publishedTimeText가 없습니다. 그런 항목은 아래에서 걸러집니다.
        publishedAt: published?.toISOString(),
        excerpt: excerpt(v.descriptionSnippet?.runs?.map((r) => r.text).join(' ') ?? ''),
        isVideo: true,
        durationSec: parseDuration(v.lengthText?.simpleText),
        viewCount: parseViews(v.viewCountText?.simpleText ?? v.shortViewCountText?.simpleText),
        imageUrl: v.thumbnail?.thumbnails?.at(-1)?.url,
      }
    })
    .filter((v) => v.publishedAt)
}
