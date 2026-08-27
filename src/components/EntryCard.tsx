import { Link } from 'react-router-dom'
import type { Entry } from '../types'
import { relativeKo } from '../lib/date'
import { excerpt } from '../lib/markdown'

const TYPE_STYLE: Record<Entry['type'], string> = {
  성과: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  회고: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  학습: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  피드백: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
}

export function TypeBadge({ type }: { type: Entry['type'] }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[type]}`}>
      {type}
    </span>
  )
}

export function EntryCard({ entry }: { entry: Entry }) {
  const preview = excerpt(entry.body)
  return (
    <Link
      to={`/entry/${entry.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:active:bg-slate-800"
    >
      <div className="flex items-center gap-2">
        <TypeBadge type={entry.type} />
        <span className="text-[12px] text-slate-400 dark:text-slate-500">
          {relativeKo(entry.occurredAt)}
        </span>
      </div>
      <h3 className="mt-1.5 font-semibold text-slate-900 dark:text-slate-100">
        {entry.title || '(제목 없음)'}
      </h3>
      {preview && (
        <p className="mt-1 line-clamp-2 text-[14px] text-slate-500 dark:text-slate-400">{preview}</p>
      )}
      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span key={t} className="text-[12px] text-blue-600 dark:text-blue-400">
              #{t}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
