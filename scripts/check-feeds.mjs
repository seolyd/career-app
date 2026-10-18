/**
 * 후보 주소가 실제로 열리고 파싱되는지 한 번에 확인합니다.
 *
 *   node scripts/check-feeds.mjs https://toss.tech/rss.xml https://news.hada.io/rss/news
 *   node scripts/check-feeds.mjs "$(cat candidates.txt)"
 *
 * 파싱은 fetch-feed.mjs를 그대로 돌려서 확인합니다 — 따로 구현하면 "여기선 됐는데
 * 파이프라인에선 안 되는" 차이가 생깁니다. 임시 소스 목록을 만들어 실제 수집기를
 * 돌리고, 리포트와 가장 최신 항목 제목을 같이 보여줍니다.
 *
 * 제목을 꼭 보세요. 200이 떠도 엉뚱한 발행처일 수 있습니다.
 */
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const urls = process.argv
  .slice(2)
  .flatMap((arg) => arg.split(/[\s,]+/))
  .map((u) => u.trim())
  .filter((u) => /^https?:\/\//i.test(u))

if (!urls.length) {
  console.error('사용법: node scripts/check-feeds.mjs <주소> [<주소> …]')
  process.exit(1)
}

const dir = mkdtempSync(join(tmpdir(), 'check-feeds-'))
const cfg = join(dir, 'sources.json')
const out = join(dir, 'feed.json')
// id는 순서를 알아볼 수 있게만 둡니다. 실제 feed-sources.json과는 무관합니다.
writeFileSync(
  cfg,
  JSON.stringify({
    sources: urls.map((url, i) => ({ id: `c${String(i + 1).padStart(2, '0')}`, group: 'guru', name: url, url })),
  }),
)
writeFileSync(out, JSON.stringify({ items: [] }))

const code = await new Promise((resolve) => {
  const child = spawn('node', [new URL('fetch-feed.mjs', import.meta.url).pathname], {
    env: { ...process.env, FEED_SOURCES: cfg, FEED_OUT: out },
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  // 후보가 전부 막히면 수집기가 1로 끝납니다. 그건 정상이고, 리포트는 그대로 읽습니다.
  child.on('exit', resolve)
})

const data = JSON.parse(readFileSync(out, 'utf8'))
if (!data.report) {
  // 수집기가 리포트를 쓰기 전에 죽었습니다 — 후보 문제가 아니라 실행 문제입니다.
  // (처음 돌릴 때 러너에 npm ci를 안 해서 fast-xml-parser가 없었습니다.)
  console.error(`수집기가 리포트를 쓰지 못했습니다 (exit ${code}). 위의 오류를 보세요.`)
  process.exit(1)
}
const byId = new Map(urls.map((url, i) => [`c${String(i + 1).padStart(2, '0')}`, url]))
const newest = new Map()
for (const item of data.items ?? []) {
  if (!newest.has(item.sourceId)) newest.set(item.sourceId, item)
}

console.log(`\n${'─'.repeat(78)}`)
console.log(`열림 ${data.report.ok.length}개 · 막힘 ${data.report.failed.length}개 / 후보 ${urls.length}개`)
console.log('─'.repeat(78))

for (const r of data.report.ok) {
  const top = newest.get(r.id)
  const kinds = [r.episodes && `에피소드 ${r.episodes}`, r.videos && `영상 ${r.videos}`].filter(Boolean).join(' · ')
  console.log(`\n✓ ${byId.get(r.id)}`)
  console.log(`    항목 ${r.count}개${kinds ? ` (${kinds})` : ''}`)
  if (top) console.log(`    최신: ${top.publishedAt?.slice(0, 10)} — ${top.title}`)
}

for (const r of data.report.failed) {
  console.log(`\n✗ ${byId.get(r.id)}`)
  console.log(`    ${r.error}`)
}
console.log('')
