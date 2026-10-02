import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** The hero card of a screen (one per screen). */
  framed?: boolean
}

export function Card({ framed, className, ...rest }: CardProps) {
  return <div className={cn('card card-pad', framed && 'card-hero', className)} {...rest} />
}
