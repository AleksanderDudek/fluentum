import type { CharacterId } from '@/domain/types'
import { cn } from '@/lib/cn'
import { Character } from './Character'

interface AvatarProps {
  id: CharacterId
  /** Diameter in px. */
  size?: number
  selected?: boolean
  /** The partner is speaking: a coral ring. */
  speaking?: boolean
  /** Hide the portrait from assistive tech when its name is written next to it. */
  decorative?: boolean
  className?: string
}

/** Round portrait on a sea-glass disc, cropped to head and shoulders. Named by the Character inside. */
export function Avatar({ id, size = 48, selected, speaking, decorative, className }: AvatarProps) {
  const width = size * 1.25
  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_30%,#e6f6f1,#b9e3d9_75%)] transition-shadow',
        selected
          ? 'shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--primary)]'
          : speaking
            ? 'shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--coral-bright)]'
            : 'shadow-[0_0_0_1px_var(--line-strong)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span className="absolute" style={{ left: (size - width) / 2, top: size * 0.06 }}>
        <Character id={id} size={width} decorative={decorative} />
      </span>
    </span>
  )
}
