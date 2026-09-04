import { Link } from 'react-router-dom'
import type { Axis, Entry, EntryType } from '../types'
import { relativeKo } from '../lib/date'
import { excerpt } from '../lib/markdown'

const TYPE_STYLE: Record<EntryType, string> = {
  Decision: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  Ship: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  Signal: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  People: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  Reflection: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  Input: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
}

export const AXIS_COLOR: Record<Axis, string> = {
  'Product Sense': 'text-teal-700 dark:text-teal-400',
  Execution: 'text-blue-700 dark:text-blue-400',
  Strategy: 'text-purple-700 dark:text-purple-400',
  Data: 'text-green-700 dark:text-green-400',
  Influence: 'text-amber-700 dark:text-amber-500',
  People: 'text-rose-700 dark:text-rose-400',
  Domain: 'text-slate-600 dark:text-slate-400',
}

export function TypeBadge({ type }: { type: EntryType }) {
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[type]}`}>{type}</span>
}

export function EntryCard({ entry }: { entry: Entry }) {
  const preview = excerpt(entry.body)
  const awaitingReview = entry.type === 'Decision' && entry.reviewDate && !entry.verdict
  return (
    <Link
      to={`/entry/${entry.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:active:bg-slate-800"
    >
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={entry.type} />
        <span className={`text-[12px] font-medium ${AXIS_COLOR[entry.axis]}`}>{entry.axis}</span>
        <span className="text-[12px] text-slate-400 dark:text-slate-500">{relativeKo(entry.occurredAt)}</span>
        {entry.publishable && <span className="text-[12px] text-blue-600 dark:text-blue-400">Publishable</span>}
      </div>
      <h3 className="mt-1.5 font-semibold text-slate-900 dark:text-slate-100">{entry.title || '(untitled)'}</h3>
      {preview && <p className="mt-1 line-clamp-2 text-[14px] text-slate-500 dark:text-slate-400">{preview}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {entry.tags.map((t) => (
          <span key={t} className="text-[12px] text-blue-600 dark:text-blue-400">#{t}</span>
        ))}
        {awaitingReview && (
          <span className="text-[12px] text-amber-700 dark:text-amber-500">Review {entry.reviewDate}</span>
        )}
        {entry.verdict && (
          <span className="text-[12px] text-slate-400 dark:text-slate-500">Prediction: {entry.verdict}</span>
        )}
      </div>
    </Link>
  )
}
