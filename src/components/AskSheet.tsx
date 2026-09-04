import { useEffect, useRef, useState } from 'react'
import { db, newId } from '../db'
import type { Ask } from '../types'
import { extractJSON, loadRedactions, redact, type Draft } from '../lib/ask'
import { Button, cx } from './ui'

/**
 * 하이브리드 LLM의 유일한 창구. 어느 화면에서든 이 한 장이 올라오고,
 * 복사 → 휴대폰 LLM → 답 붙여넣기로 끝납니다.
 * 하루에 열 번 열어도 부담이 없어야 하므로 기본 상태는 버튼 하나입니다.
 */
export function AskSheet({
  draft,
  onClose,
  onResult,
}: {
  draft: Draft | null
  onClose: () => void
  onResult?: (reply: string, parsed: unknown, ask: Ask) => void
}) {
  const [reply, setReply] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [saving, setSaving] = useState(false)
  const askIdRef = useRef<string | null>(null)
  const replyRef = useRef<HTMLTextAreaElement>(null)

  const redactions = loadRedactions()
  const finalPrompt = draft ? redact(draft.prompt, redactions) : ''
  const changed = draft ? finalPrompt !== draft.prompt : false

  useEffect(() => {
    if (!draft) {
      setReply('')
      setCopied(false)
      setShowPrompt(false)
      askIdRef.current = null
      return
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [draft])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (draft) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft, onClose])

  if (!draft) return null

  async function copyPrompt() {
    if (!draft) return
    const now = Date.now()
    const id = askIdRef.current ?? newId()
    askIdRef.current = id
    try {
      await navigator.clipboard.writeText(finalPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드가 막히면 전문을 펼쳐서 직접 복사하게 합니다
      setShowPrompt(true)
    }
    if (!(await db.asks.get(id))) {
      await db.asks.add({
        id,
        kind: draft.kind,
        title: draft.title,
        prompt: finalPrompt,
        status: 'Copied',
        originType: draft.originType,
        originId: draft.originId,
        createdAt: now,
      })
    }
    replyRef.current?.focus()
  }

  async function saveReply() {
    if (!draft || !reply.trim()) return
    setSaving(true)
    const now = Date.now()
    const id = askIdRef.current ?? newId()
    askIdRef.current = id
    const parsed = extractJSON(reply)
    const existing = await db.asks.get(id)
    const record: Ask = {
      id,
      kind: draft.kind,
      title: draft.title,
      prompt: finalPrompt,
      reply,
      parsed,
      status: 'Answered',
      originType: draft.originType,
      originId: draft.originId,
      createdAt: existing?.createdAt ?? now,
      repliedAt: now,
    }
    await db.asks.put(record)
    setSaving(false)
    onResult?.(reply, parsed, record)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={draft.title}
        className="safe-bottom flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-slate-900"
      >
        <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" />

        <div className="mb-1 flex items-start gap-3">
          <h2 className="flex-1 text-[17px] font-bold">{draft.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 p-1 text-slate-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p className="mb-4 text-[13px] text-slate-500 dark:text-slate-400">
          Copy this into the LLM on your phone, then paste the answer back below.
          {changed && <span className="text-amber-700 dark:text-amber-500"> · redactions applied</span>}
        </p>

        <Button variant="primary" className="w-full" onClick={() => void copyPrompt()}>
          {copied ? 'Copied — paste it into your LLM' : 'Copy prompt'}
        </Button>

        <button
          type="button"
          onClick={() => setShowPrompt((v) => !v)}
          className="mt-2.5 self-start text-[13px] font-medium text-blue-600 dark:text-blue-400"
        >
          {showPrompt ? 'Hide what gets sent' : `See what gets sent (${finalPrompt.length.toLocaleString()} chars)`}
        </button>
        {showPrompt && (
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-100 p-3 text-[12px] leading-6 whitespace-pre-wrap text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {finalPrompt}
          </pre>
        )}

        <label className="mt-5 mb-1.5 block text-[13px] font-medium text-slate-500 dark:text-slate-400">
          Answer from the LLM
        </label>
        <textarea
          ref={replyRef}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={6}
          placeholder="Paste it here"
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 leading-7 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
        />

        <div className="mt-3 flex gap-2">
          <Button
            variant="primary"
            className={cx('flex-1', !reply.trim() && 'opacity-50')}
            disabled={!reply.trim() || saving}
            onClick={() => void saveReply()}
          >
            {saving ? 'Saving' : 'Save answer'}
          </Button>
          <Button onClick={onClose}>Later</Button>
        </div>
      </div>
    </div>
  )
}

/** 어느 화면에서든 붙일 수 있는 작은 트리거. */
export function AskButton({
  label = 'Ask an LLM',
  onClick,
  className,
}: {
  label?: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 text-[13px] font-medium text-blue-700 active:bg-blue-100 dark:bg-blue-950 dark:text-blue-300',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M12 3l1.9 4.7L18.6 9l-4.7 1.9L12 15.6l-1.9-4.7L5.4 9l4.7-1.3z" />
        <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
      </svg>
      {label}
    </button>
  )
}
