import { useState } from 'react'
import { Chip, Input } from './ui'

export function TagInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
}) {
  const [draft, setDraft] = useState('')

  function add(tag: string) {
    const clean = tag.trim().replace(/^#/, '')
    if (!clean || value.includes(clean)) return setDraft('')
    onChange([...value, clean])
    setDraft('')
  }

  const unused = suggestions.filter((s) => !value.includes(s)).slice(0, 8)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="rounded-full bg-blue-100 px-3 py-1.5 text-[13px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          >
            #{tag} <span className="ml-0.5 opacity-50">×</span>
          </button>
        ))}
      </div>
      <Input
        className={value.length ? 'mt-2' : ''}
        value={draft}
        placeholder="Add a tag (Enter)"
        enterKeyHint="done"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => add(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(draft)
          }
          if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
        }}
      />
      {unused.length > 0 && (
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
          {unused.map((s) => (
            <Chip key={s} onClick={() => add(s)}>
              #{s}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}
