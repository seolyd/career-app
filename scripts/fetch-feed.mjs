/**
 * feed-sources.json의 RSS/Atom을 모아 public/feed.json으로 씁니다.
 * GitHub Actions에서 매일 돌고, 앱은 같은 출처의 이 파일 하나만 읽습니다 — CORS도 서버도 없습니다.
 *
 * 원칙 둘:
 *  - 제목·링크·발행일·발췌만 담습니다. 본문은 복제하지 않고 읽기는 원문으로 보냅니다.
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
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])

function stripHtml(s) {
  return String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function excerpt(s, max = 220) {
  const flat = stripHtml(s)
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
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
  const rss = asArray(doc?.rss?.channel?.item)
  if (rss.length) {
    return rss.map((i) => ({
      title: stripHtml(i.title),
      url: typeof i.link === 'string' ? i.link : pickLink(i),
      publishedAt: toISO(i.pubDate ?? i['dc:date']),
      excerpt: excerpt(i.description ?? i['content:encoded']),
    }))
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
    headers: { 'user-agent': 'career-app-feed/1.0 (+https://github.com/seolyd/career-app)' },
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
      title: i.title,
      url: i.url,
      publishedAt: i.publishedAt ?? new Date().toISOString(),
      excerpt: i.excerpt,
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
        ok: ok.map((r) => ({ id: r.source.id, count: r.items.length })),
        failed: failed.map((r) => ({ id: r.source.id, url: r.source.url, error: r.error })),
      },
    },
    null,
    2,
  )}\n`,
)

console.log(`${items.length} items from ${ok.length}/${config.sources.length} sources`)
for (const r of failed) console.warn(`  FAILED ${r.source.id} (${r.source.url}): ${r.error}`)
if (!ok.length) {
  console.error(`every source failed — check ${CONFIG_PATH}`)
  process.exit(1)
}
