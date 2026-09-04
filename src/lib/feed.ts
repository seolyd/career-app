/**
 * 피드는 GitHub Action이 만들어 둔 같은 출처의 정적 파일 하나입니다.
 * 서버도 CORS도 없고, 읽음 상태만 기기에 남습니다.
 */
export const FEED_GROUPS = ['guru', 'hrtech', 'ai'] as const
export type FeedGroup = (typeof FEED_GROUPS)[number]

export const GROUP_LABEL: Record<FeedGroup, string> = {
  guru: 'PM gurus',
  hrtech: 'HR tech',
  ai: 'PM · AI',
}

export interface FeedItem {
  id: string
  sourceId: string
  sourceName: string
  group: FeedGroup
  /** Board 좌석 id와 연결됩니다 */
  authorId?: string
  title: string
  url: string
  publishedAt: string
  excerpt: string
}

export interface FeedFile {
  generatedAt: string
  items: FeedItem[]
  report?: {
    ok: Array<{ id: string; count: number }>
    failed: Array<{ id: string; url: string; error: string }>
  }
}

export async function loadFeed(): Promise<FeedFile | null> {
  try {
    const res = await fetch('/feed.json', { cache: 'no-cache' })
    if (!res.ok) return null
    const data = (await res.json()) as FeedFile
    return Array.isArray(data?.items) ? data : null
  } catch {
    // 아직 Action이 안 돌았거나 오프라인입니다. 피드가 없다고 앱이 막히면 안 됩니다.
    return null
  }
}
