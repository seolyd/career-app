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

/**
 * 소스가 선언하는 값이 아니라 항목에서 판별합니다 — 오디오 첨부가 있으면 episode.
 * Substack처럼 글과 팟캐스트를 같은 피드로 내는 곳이 하나의 소스로 둘 다 만들어냅니다.
 */
export type FeedKind = 'article' | 'episode'

export interface FeedItem {
  id: string
  sourceId: string
  sourceName: string
  group: FeedGroup
  kind: FeedKind
  /** Board 좌석 id와 연결됩니다 */
  authorId?: string
  title: string
  url: string
  publishedAt: string
  excerpt: string
  /** episode일 때만: 재생할 오디오 파일 */
  audioUrl?: string
  /** itunes:duration에서 옴. 유튜브 RSS에는 없어서 영상에는 안 붙습니다 */
  durationSec?: number
  imageUrl?: string
}

/** 아직 kind가 없던 시절의 feed.json도 읽습니다 — Action이 한 번 더 돌면 채워집니다. */
export function kindOf(item: FeedItem): FeedKind {
  return item.kind ?? (item.audioUrl ? 'episode' : 'article')
}

export function formatDuration(sec: number | undefined): string | null {
  if (!sec || sec < 1) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 목록 필터용 — 길이를 아는 에피소드에만 적용됩니다. */
export const LENGTH_BUCKETS = [
  { id: 'short', label: 'Under 20m', max: 20 * 60 },
  { id: 'medium', label: '20–45m', min: 20 * 60, max: 45 * 60 },
  { id: 'long', label: '45m+', min: 45 * 60 },
] as const
export type LengthBucket = (typeof LENGTH_BUCKETS)[number]['id']

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
