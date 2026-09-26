/**
 * 소스 주소를 찾아주는 일회성 도구입니다. 매일 도는 파이프라인에는 들어가지 않습니다
 * — fetch-feed.mjs는 feed-sources.json에 박힌 정적 주소만 읽습니다.
 *
 *   npm run find-podcast "Product Thinking"    팟캐스트: 쇼 이름으로 RSS 찾기
 *   npm run find-podcast @LennysPodcast        유튜브: 핸들로 채널 피드 찾기
 *
 * 유튜브 채널 RSS는 핸들이 아니라 UC로 시작하는 채널 ID를 요구해서, 채널 페이지에서
 * 그 값을 한 번 읽어옵니다. 키도 할당량도 없습니다.
 */
const term = process.argv.slice(2).join(' ').trim()
if (!term) {
  console.error('사용법: npm run find-podcast "쇼 이름"  또는  npm run find-podcast @채널핸들')
  process.exit(1)
}

if (term.startsWith('@') || term.includes('youtube.com/')) {
  const handle = term.startsWith('@') ? term : term.split('youtube.com/')[1]
  const page = await fetch(`https://www.youtube.com/${handle}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!page.ok) {
    console.error(`채널 페이지를 못 열었습니다: HTTP ${page.status}`)
    process.exit(1)
  }
  const html = await page.text()
  // externalId가 이 페이지 자신의 채널입니다. channelId는 추천 채널 블록에도 들어 있어서,
  // 먼저 잡히면 엉뚱한 채널을 집어옵니다 — @ProductSchool이 Werner Müller로 나온 이유입니다.
  const id =
    html.match(/"externalId":"(UC[\w-]{20,})"/)?.[1] ??
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{20,})"/)?.[1] ??
    html.match(/"channelId":"(UC[\w-]{20,})"/)?.[1]
  const name = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? handle
  if (!id) {
    console.error('채널 ID를 찾지 못했습니다. 유튜브가 페이지 구조를 바꿨을 수 있습니다.')
    process.exit(1)
  }
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`
  // 주소를 찍어주기만 하고 열리는지는 안 봤더니, 404가 나는 주소를 소스에 넣은 적이 있습니다.
  // 여기서 한 번 열어보고 상태를 같이 보여줍니다.
  const probe = await fetch(feedUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
      accept: 'application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
    signal: AbortSignal.timeout(20_000),
  }).then(
    async (r) => ({ status: r.status, items: (await r.text()).match(/<entry>/g)?.length ?? 0 }),
    (err) => ({ status: String(err?.message ?? err), items: 0 }),
  )
  console.log(`\n${name}`)
  console.log(`  channel id: ${id}`)
  console.log(`  page: https://www.youtube.com/${handle} → HTTP ${page.status}`)
  console.log(`  ${feedUrl}`)
  console.log(
    probe.status === 200
      ? `  RSS: HTTP 200 · 항목 ${probe.items}개 — 소스에 넣어도 됩니다`
      : `  RSS: HTTP ${probe.status} — 이 주소는 지금 여기서 안 열립니다. 넣으면 매번 실패로 남습니다`,
  )
  if (probe.status === 200) {
    console.log(`\nfeed-sources.json 의 sources 에 이렇게 넣으면 됩니다:`)
    console.log(`  { "id": "<짧은-id>", "group": "guru", "name": "${name}", "url": "${feedUrl}" }`)
  }
  process.exit(0)
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
