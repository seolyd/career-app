/**
 * 팟캐스트 RSS 주소를 찾아주는 일회성 도구입니다. 매일 도는 파이프라인에는 들어가지
 * 않습니다 — fetch-feed.mjs는 feed-sources.json에 박힌 정적 주소만 읽습니다.
 *
 * 쇼 이름만 알면 되고 키도 등록도 없습니다. 결과를 feed-sources.json에 붙여넣으세요.
 *   npm run find-podcast "Product Thinking"
 */
const term = process.argv.slice(2).join(' ').trim()
if (!term) {
  console.error('사용법: npm run find-podcast "쇼 이름"')
  process.exit(1)
}

const url = `https://itunes.apple.com/search?media=podcast&entity=podcast&limit=5&term=${encodeURIComponent(term)}`
const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
if (!res.ok) {
  console.error(`검색 실패: HTTP ${res.status}`)
  process.exit(1)
}

const { results = [] } = await res.json()
if (!results.length) {
  console.error(`"${term}" 에 맞는 팟캐스트가 없습니다.`)
  process.exit(1)
}

for (const r of results) {
  if (!r.feedUrl) continue
  console.log(`\n${r.collectionName} — ${r.artistName}`)
  console.log(`  ${r.trackCount ?? '?'} episodes · ${(r.genres ?? []).slice(0, 3).join(', ')}`)
  console.log(`  ${r.feedUrl}`)
}
console.log(`\nfeed-sources.json 의 sources 에 이렇게 넣으면 됩니다:`)
console.log(`  { "id": "<짧은-id>", "group": "guru", "name": "<쇼 이름>", "url": "<위 주소>" }`)
