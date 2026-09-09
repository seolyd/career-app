/**
 * feed-sources.json의 RSS/Atom을 모아 public/feed.json으로 씁니다.
 * GitHub Actions에서 매일 돌고, 앱은 같은 출처의 이 파일 하나만 읽습니다 — CORS도 서버도 없습니다.
 *
 * 원칙 둘:
 *  - 제목·링크·발행일·발췌만 담습니다. 본문은 복제하지 않고 읽기는 원문으로 보냅니다.
 *  - 팟캐스트는 별도 파이프라인을 두지 않습니다. 오디오 첨부(enclosure)가 붙은 항목을
 *    episode로 표시할 뿐이라, 글과 에피소드를 같이 내는 피드도 소스 하나로 끝납니다.
 *  - 한 소스가 죽어도 나머지는 갱신하고, 실패는 report에 남깁니다. 피드는 언젠가 깨지니까요.
 */
import { XMLParser } from 'fast-xml-parser'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const MAX_PER_SOURCE = 8
const MAX_TOTAL = 160
const TIMEOUT_MS = 20_000

// 테스트에서 다른 소스 목록/출력 경로를 물릴 수 있게 열어둡니다.
const CONFIG_PATH = process.env.FEED_SOURCES ?? 'feed-sources.json'
const OUT_PATH = process.env.FEED_OUT ?? 'public/feed.json'

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
// processEntities를 끕니다. 켜두면 엔티티가 많은 피드(예: simonwillison.net)가
// 파서의 확장 한도에 걸려 통째로 실패합니다. 엔티티는 stripHtml에서 직접 풉니다.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
})

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])

/**
 * 엔티티를 먼저 풀고 나서 태그를 벗깁니다. 순서가 중요합니다 — 팟캐스트 쇼노트는
 * 보통 HTML을 &lt;p&gt; 형태로 escape해서 보내는데, 태그부터 벗기면 그게 그대로 남습니다.
 * &amp;만 마지막에 푸는 이유는 &amp;lt;가 태그로 되살아나는 걸 막기 위해서입니다.
 */
function stripHtml(s) {
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

function excerpt(s, max = 220) {
  const flat = stripHtml(s)
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

/** itunes:duration은 "3600" · "45:30" · "1:02:03" 세 형태로 옵니다. */
function parseDuration(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return undefined
  if (/^\d+$/.test(raw)) return Number(raw)
  const parts = raw.split(':').map((p) => Number(p.trim()))
  if (!parts.length || parts.some((p) => !Number.isFinite(p))) return undefined
  const sec = parts.reduce((acc, p) => acc * 60 + p, 0)
  return sec > 0 ? Math.round(sec) : undefined
}

/** 오디오 enclosure가 있으면 에피소드입니다. type이 없는 피드도 있어 확장자로 한 번 더 봅니다. */
function pickAudio(item) {
  const encs = asArray(item.enclosure)
  const byType = encs.find((e) => String(e?.['@_type'] ?? '').toLowerCase().startsWith('audio'))
  const byExt = encs.find((e) => /\.(mp3|m4a|aac|ogg|wav)(\?|$)/i.test(String(e?.['@_url'] ?? '')))
  return (byType ?? byExt)?.['@_url'] || undefined
}

function pickImage(item, channelImage) {
  const ep = item['itunes:image']?.['@_href']
  return ep || channelImage || undefined
}

/** Atom의 link는 배열이거나 속성에 들어 있습니다. */
function pickLink(entry) {
  if (typeof entry.link === 'string') return entry.link
  const links = asArray(entry.link)
  const alt = links.find((l) => l?.['@_rel'] === 'alternate' && l?.['@_href'])
  const any = links.find((l) => l?.['@_href'])
  return alt?.['@_href'] ?? any?.['@_href'] ?? entry.id ?? ''
}

function toISO(value) {
  const d = new Date(value ?? '')
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function readItems(xml) {
  const doc = parser.parse(xml)
  const channel = doc?.rss?.channel
  const rss = asArray(channel?.item)
  if (rss.length) {
    const channelImage = channel?.['itunes:image']?.['@_href'] ?? channel?.image?.url ?? undefined
    return rss.map((i) => {
      const audioUrl = pickAudio(i)
      return {
        title: stripHtml(i.title),
        url: typeof i.link === 'string' ? i.link : pickLink(i),
        publishedAt: toISO(i.pubDate ?? i['dc:date']),
        excerpt: excerpt(i.description ?? i['content:encoded'] ?? i['itunes:summary']),
        ...(audioUrl
          ? {
              audioUrl,
              durationSec: parseDuration(i['itunes:duration']),
              imageUrl: pickImage(i, channelImage),
            }
          : {}),
      }
    })
  }
  const atom = asArray(doc?.feed?.entry)
  return atom.map((e) => ({
    title: stripHtml(typeof e.title === 'object' ? e.title['#text'] : e.title),
    url: pickLink(e),
    publishedAt: toISO(e.published ?? e.updated),
    excerpt: excerpt(
      typeof e.summary === 'object' ? e.summary['#text'] : (e.summary ?? (typeof e.content === 'object' ? e.content['#text'] : e.content)),
    ),
  }))
}

async function fetchSource(source) {
  const res = await fetch(source.url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const items = readItems(await res.text())
  if (!items.length) throw new Error('no items parsed')
  return items
    .filter((i) => i.title && i.url)
    .slice(0, MAX_PER_SOURCE)
    .map((i) => ({
      id: `${source.id}:${i.url}`,
      sourceId: source.id,
      sourceName: source.name,
      group: source.group,
      ...(source.authorId ? { authorId: source.authorId } : {}),
      kind: i.audioUrl ? 'episode' : 'article',
      title: i.title,
      url: i.url,
      publishedAt: i.publishedAt ?? new Date().toISOString(),
      excerpt: i.excerpt,
      ...(i.audioUrl ? { audioUrl: i.audioUrl } : {}),
      ...(i.durationSec ? { durationSec: i.durationSec } : {}),
      ...(i.imageUrl ? { imageUrl: i.imageUrl } : {}),
    }))
}

const previous = existsSync(OUT_PATH)
  ? JSON.parse(readFileSync(OUT_PATH, 'utf8'))
  : { items: [] }

const results = await Promise.all(
  config.sources.map(async (source) => {
    try {
      return { source, items: await fetchSource(source) }
    } catch (err) {
      return { source, error: err instanceof Error ? err.message : String(err) }
    }
  }),
)

const ok = results.filter((r) => r.items)
const failed = results.filter((r) => r.error)

// 실패한 소스는 지난번 항목을 그대로 두어, 일시적 장애로 목록이 비지 않게 합니다.
const keptIds = new Set(failed.map((r) => r.source.id))
const kept = (previous.items ?? []).filter((i) => keptIds.has(i.sourceId))

const items = [...ok.flatMap((r) => r.items), ...kept]
  .filter((item, i, arr) => arr.findIndex((x) => x.id === item.id) === i)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  .slice(0, MAX_TOTAL)

writeFileSync(
  OUT_PATH,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      items,
      report: {
        ok: ok.map((r) => ({
          id: r.source.id,
          count: r.items.length,
          episodes: r.items.filter((i) => i.kind === 'episode').length,
        })),
        failed: failed.map((r) => ({ id: r.source.id, url: r.source.url, error: r.error })),
      },
    },
    null,
    2,
  )}\n`,
)

const episodes = items.filter((i) => i.kind === 'episode').length
console.log(
  `${items.length} items (${episodes} episodes) from ${ok.length}/${config.sources.length} sources`,
)
for (const r of ok) {
  const eps = r.items.filter((i) => i.kind === 'episode').length
  if (eps) console.log(`  ${r.source.id}: ${eps} episode(s)`)
}
for (const r of failed) console.warn(`  FAILED ${r.source.id} (${r.source.url}): ${r.error}`)
if (!ok.length) {
  console.error(`every source failed — check ${CONFIG_PATH}`)
  process.exit(1)
}
