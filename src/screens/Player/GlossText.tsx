import type { Gloss } from '@/domain/dialogue'
import type { MemoryLevel } from '@/domain/memory/mask'
import type { Lang } from '@/domain/types'
import { cn } from '@/lib/cn'

interface GlossTextProps {
  gloss: Gloss
  lang: Lang
  /** Link ids lit right now (the word the user points at and its counterpart). */
  active?: readonly string[]
  /** Pointing at a linked word (hover with a mouse, tap on a touch screen); null = nothing. */
  onPoint?: (ids: readonly string[] | null) => void
  /** Live mode: which whitespace-separated words of the line were already heard (and, when masked, shown). */
  covered?: readonly boolean[]
  /** Prompt / recall: hide the letters of the words not heard yet (first letters stay with `initials`). */
  mask?: MemoryLevel | null
  /** What assistive tech hears instead of a masked line. */
  maskedLabel?: string
  className?: string
  testId?: string
}

const LETTER = /[\p{L}\p{N}]/u
const DOT = '·'

/** The line with the letters of every word not revealed replaced by dots (same length, so the parts still line up). */
function maskLine(plain: string, level: MemoryLevel, revealed: readonly boolean[]): string {
  const wordAt = wordIndexes(plain)
  let seen = 0
  let word = -1
  return Array.from(plain, (char, i) => {
    const w = wordAt[i] ?? -1
    if (w !== word) {
      word = w
      seen = 0
    }
    if (w < 0 || revealed[w] || !LETTER.test(char)) return char
    seen++
    return level === 'initials' && seen === 1 ? char : DOT
  }).join('')
}

/** Heard/unheard runs of `text`, which starts at `offset` in the whole line. */
function heardRuns(text: string, offset: number, wordAt: readonly number[], covered: readonly boolean[] | undefined) {
  if (!covered) return [{ text, heard: false }]
  const runs: Array<{ text: string; heard: boolean }> = []
  for (let i = 0; i < text.length; i++) {
    const word = wordAt[offset + i] ?? -1
    const heard = word >= 0 && !!covered[word]
    const last = runs.at(-1)
    if (last && last.heard === heard) last.text += text[i]
    else runs.push({ text: text[i]!, heard })
  }
  return runs
}

/** Index of the whitespace-separated word each character of `plain` belongs to (-1 for spaces). */
function wordIndexes(plain: string): number[] {
  let word = -1
  let inWord = false
  return Array.from(plain, (char) => {
    if (/\s/u.test(char)) {
      inWord = false
      return -1
    }
    if (!inWord) word++
    inWord = true
    return word
  })
}

/**
 * A line with its linked words coloured by grammatical role. Unmasked, the rendered text is exactly the line
 * (spans only wrap it), so assistive tech reads it unchanged; masked, the dots are hidden from assistive tech and
 * `maskedLabel` is read instead. `data-line` always holds the line (the e2e fake recogniser says it).
 */
export function GlossText({ gloss, lang, active, onPoint, covered, mask, maskedLabel, className, testId }: GlossTextProps) {
  const wordAt = covered ? wordIndexes(gloss.plain) : []
  const shown = mask ? maskLine(gloss.plain, mask, covered ?? []) : gloss.plain
  // Where each part starts in the whole line.
  const starts = gloss.parts.map((_, index) => gloss.parts.slice(0, index).reduce((sum, part) => sum + part.text.length, 0))
  const parts = gloss.parts.map((part, index) => {
    const text = shown.slice(starts[index]!, starts[index]! + part.text.length)
    const runs = heardRuns(text, starts[index]!, wordAt, mask ? undefined : covered).map((run, i) =>
      run.heard ? (
        <span key={i} className="gloss-heard">
          {run.text}
        </span>
      ) : (
        run.text
      ),
    )
    if (part.ids.length === 0) return <span key={index} className={cn(mask && 'gloss-masked')}>{runs}</span>
    const lit = !!active?.some((id) => part.ids.includes(id))
    return (
      // Pointing is a visual aid; the same pairs are listed as text in the bubble's word list (keyboard,
      // screen readers), so the words themselves stay out of the tab order.
      // A mouse lights a pair while hovering; a finger or pen toggles it with a tap.
      // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
      <span
        key={index}
        className="gloss-word"
        data-role={part.role}
        data-active={lit || undefined}
        onPointerEnter={(event) => event.pointerType === 'mouse' && onPoint?.(part.ids)}
        onPointerLeave={(event) => event.pointerType === 'mouse' && onPoint?.(null)}
        onPointerUp={(event) => event.pointerType !== 'mouse' && onPoint?.(lit ? null : part.ids)}
      >
        {runs}
      </span>
    )
  })
  return (
    <span lang={lang} data-testid={testId} data-line={gloss.plain} className={cn('block', className)}>
      {mask ? (
        <>
          <span aria-hidden>{parts}</span>
          {maskedLabel && <span className="sr-only">{maskedLabel}</span>}
        </>
      ) : (
        parts
      )}
    </span>
  )
}
