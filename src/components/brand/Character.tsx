import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { CharacterId } from '@/domain/types'
import { Portrait, type Expression, type PortraitProps } from './Portrait'

/* The cast: four women and four men — the user's avatar and the conversation partners. */
const CAST: Record<CharacterId, Pick<PortraitProps, 'skin' | 'hair' | 'hairStyle' | 'shirt' | 'beard' | 'glasses' | 'earrings'>> = {
  anna: { skin: 1, hair: 'brown', hairStyle: 'long', shirt: 'teal', earrings: true },
  maria: { skin: 0, hair: 'auburn', hairStyle: 'bob', shirt: 'coral' },
  grace: { skin: 4, hair: 'black', hairStyle: 'puff', shirt: 'sun', earrings: true },
  ewa: { skin: 1, hair: 'grey', hairStyle: 'bun', shirt: 'plum', glasses: true },
  jan: { skin: 1, hair: 'blonde', hairStyle: 'short', shirt: 'sky' },
  michal: { skin: 2, hair: 'dark', hairStyle: 'short', shirt: 'leaf', beard: true },
  david: { skin: 3, hair: 'black', hairStyle: 'coils', shirt: 'navy' },
  piotr: { skin: 0, hair: 'grey', hairStyle: 'short', shirt: 'sand', glasses: true, beard: true },
}

interface CharacterProps {
  id: CharacterId
  expression?: Expression
  wave?: boolean
  size?: number
  /** Decorative when a visible name is already next to it. */
  decorative?: boolean
  className?: string
  style?: CSSProperties
}

/** A member of the cast. */
export function Character({ id, expression, wave, size = 200, decorative, className, style }: CharacterProps) {
  const { t } = useTranslation()
  return (
    <Portrait
      {...CAST[id]}
      expression={expression}
      wave={wave}
      size={size}
      title={decorative ? undefined : t(`characters.${id}`)}
      className={className}
      style={style}
    />
  )
}
