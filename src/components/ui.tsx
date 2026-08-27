import type { ButtonHTMLAttributes, ComponentPropsWithRef, ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      {children}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

export function Button({ variant = 'ghost', className, ...rest }: ButtonProps) {
  const styles = {
    primary: 'bg-blue-600 text-white active:bg-blue-700 disabled:bg-blue-600/50',
    ghost:
      'bg-slate-100 text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700',
    danger: 'bg-red-50 text-red-600 active:bg-red-100 dark:bg-red-950 dark:text-red-400',
  }[variant]
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-[15px] font-medium transition-colors disabled:opacity-50',
        styles,
        className,
      )}
    />
  )
}

const fieldBase =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600'

export function Input({ className, ...rest }: ComponentPropsWithRef<'input'>) {
  return <input {...rest} className={cx(fieldBase, className)} />
}

export function Textarea({ className, ...rest }: ComponentPropsWithRef<'textarea'>) {
  return <textarea {...rest} className={cx(fieldBase, 'resize-none leading-7', className)} />
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      )}
    >
      {children}
    </button>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[13px] font-medium text-slate-500 dark:text-slate-400">
      {children}
    </span>
  )
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-[15px] font-medium text-slate-500 dark:text-slate-400">{title}</p>
      {hint && <p className="mt-1.5 text-[13px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {children}
      </h2>
      {action}
    </div>
  )
}
