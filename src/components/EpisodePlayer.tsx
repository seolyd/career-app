import { useEffect, useRef, useState } from 'react'
import { db } from '../db'
import { formatDuration, type FeedItem } from '../lib/feed'

/**
 * 앱 안에서 바로 듣습니다. 다만 홈화면 PWA는 화면을 잠그면 iOS가 오디오를 끊을 수
 * 있어서, 팟캐스트 앱으로 넘기는 버튼을 항상 옆에 둡니다 — 통근길에는 그쪽이 맞습니다.
 *
 * 위치는 feedStates에 초 단위로 남깁니다. 색인 없는 필드라 스키마 변경은 없습니다.
 */
export function EpisodePlayer({ item, onFinished }: { item: FeedItem; onFinished?: () => void }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [len, setLen] = useState(item.durationSec ?? 0)
  const [failed, setFailed] = useState(false)
  const saved = useRef(0)

  // 저장해 둔 위치에서 이어 듣습니다.
  useEffect(() => {
    let alive = true
    void db.feedStates.get(item.id).then((s) => {
      const at = s?.positionSec ?? 0
      if (!alive || !ref.current || at < 5) return
      ref.current.currentTime = at
      setPos(at)
    })
    return () => {
      alive = false
    }
  }, [item.id])

  // 잠금화면 제목·아트워크. 재생 컨트롤이 시스템 UI에 뜹니다.
  useEffect(() => {
    if (!playing || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: item.sourceName,
      artwork: item.imageUrl ? [{ src: item.imageUrl }] : undefined,
    })
    navigator.mediaSession.setActionHandler('play', () => void ref.current?.play())
    navigator.mediaSession.setActionHandler('pause', () => ref.current?.pause())
    navigator.mediaSession.setActionHandler('seekbackward', () => skip(-15))
    navigator.mediaSession.setActionHandler('seekforward', () => skip(30))
  }, [playing, item.title, item.sourceName, item.imageUrl])

  function persist(at: number) {
    // 5초에 한 번만 씁니다 — 매 tick마다 쓰면 IndexedDB가 쉬지 못합니다.
    if (Math.abs(at - saved.current) < 5) return
    saved.current = at
    // readAt은 0으로 둡니다. 듣기 시작한 것과 다 들은 것은 다릅니다 — 0이면 목록에
    // 그대로 남고 위치만 기억됩니다. 끝까지 들으면 onEnded가 readAt을 채웁니다.
    void db.feedStates.get(item.id).then((prev) =>
      db.feedStates.put({ ...prev, feedItemId: item.id, readAt: prev?.readAt ?? 0, positionSec: at }),
    )
  }

  function skip(by: number) {
    const el = ref.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(el.currentTime + by, len || el.duration || 0))
  }

  if (failed) {
    return (
      <p className="mt-3 text-[13px] leading-6 text-slate-500">
        This episode won’t play in the app — its host blocks direct playback. Open it in Podcasts below.
      </p>
    )
  }

  const pct = len > 0 ? Math.min(100, (pos / len) * 100) : 0

  return (
    <div className="mt-3 rounded-xl bg-slate-100 p-3">
      <audio
        ref={ref}
        src={item.audioUrl}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false)
          if (ref.current) persist(ref.current.currentTime)
        }}
        onLoadedMetadata={() => {
          const d = ref.current?.duration
          if (d && Number.isFinite(d)) setLen(d)
        }}
        onTimeUpdate={() => {
          const at = ref.current?.currentTime ?? 0
          setPos(at)
          persist(at)
        }}
        onEnded={() => {
          setPlaying(false)
          saved.current = 0
          void db.feedStates.get(item.id).then((prev) =>
            db.feedStates.put({ ...prev, feedItemId: item.id, readAt: Date.now(), positionSec: 0 }),
          )
          onFinished?.()
        }}
        onError={() => setFailed(true)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => (playing ? ref.current?.pause() : void ref.current?.play())}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5"><path d="M8 5.5v13l11-6.5z"/></svg>
          )}
        </button>

        <button type="button" aria-label="Back 15 seconds" onClick={() => skip(-15)} className="shrink-0 text-[13px] font-semibold text-slate-600">−15s</button>
        <button type="button" aria-label="Forward 30 seconds" onClick={() => skip(30)} className="shrink-0 text-[13px] font-semibold text-slate-600">+30s</button>

        <span className="ml-auto shrink-0 tabular-nums text-[12px] text-slate-500">
          {formatDuration(pos) ?? '0:00'} / {formatDuration(len) ?? '—'}
        </span>
      </div>

      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={len || 0}
        step={1}
        value={pos}
        disabled={!len}
        onChange={(e) => {
          const at = Number(e.target.value)
          if (ref.current) ref.current.currentTime = at
          setPos(at)
        }}
        className="mt-2.5 h-1.5 w-full appearance-none rounded-full bg-slate-300 accent-blue-600"
        style={{ background: `linear-gradient(to right, #2563eb ${pct}%, #cbd5e1 ${pct}%)` }}
      />
    </div>
  )
}
