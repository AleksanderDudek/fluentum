import type { ReactNode } from 'react'
import { Lori, type LoriMood } from '@/components/brand/Lori'

/** Dashed well with Lori (resting by default), a title, body and an optional action. */
export function EmptyState({ title, body, action, mood = 'rest' }: { title: string; body?: ReactNode; action?: ReactNode; mood?: LoriMood }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 pt-7 pb-9 text-center">
      <Lori mood={mood} size={104} decorative className="mb-2" />
      <h2 className="text-xl font-semibold">{title}</h2>
      {body && <p className="mt-2 max-w-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
