import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PoolProps {
  /** Sunlight in the water behind the figure. */
  glow?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * The hero panel of a screen: a rounded pool of light water with a wave along its floor, where Lori or a portrait
 * stands. At most one per screen.
 */
export function Pool({ glow, className, style, children }: PoolProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-line-strong shadow-(--shadow-hero)',
        glow
          ? 'bg-[radial-gradient(75%_70%_at_50%_30%,color-mix(in_oklab,var(--gold-soft)_75%,var(--surface)),var(--surface)_80%)]'
          : 'bg-surface',
        className,
      )}
      style={style}
    >
      <svg aria-hidden viewBox="0 0 400 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full">
        <path d="M0 22c50 0 50-14 100-14s50 14 100 14 50-14 100-14 50 14 100 14v18H0z" fill="var(--primary)" fillOpacity=".08" />
        <path d="M0 30c50 0 50-10 100-10s50 10 100 10 50-10 100-10 50 10 100 10v10H0z" fill="var(--primary)" fillOpacity=".08" />
      </svg>
      <div className="relative h-full">{children}</div>
    </div>
  )
}
