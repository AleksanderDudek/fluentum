import { cn } from '@/lib/cn'

/** Fluentum mark: a speech bubble carrying a rising wave (speech that keeps flowing). Fixed pigments. */
export function FluentumMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn('shrink-0', className)}>
      <defs>
        <linearGradient id="fluentum-mark-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ef6a4e" />
          <stop offset="1" stopColor="#f2b33d" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="#0b6b66" />
      <path d="M12 11h24a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H22l-7 5v-5h-3a4 4 0 0 1-4-4V15a4 4 0 0 1 4-4z" fill="#f2fbf8" />
      <path d="M13 27c3 0 4-7 7-7s4 5 7 5 4-5 7-9" fill="none" stroke="url(#fluentum-mark-wave)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
