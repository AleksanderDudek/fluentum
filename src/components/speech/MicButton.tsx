import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/icons/Icon'
import { cn } from '@/lib/cn'

interface MicButtonProps {
  listening: boolean
  busy?: boolean
  disabled?: boolean
  onClick: () => void
  size?: 'md' | 'lg'
}

/**
 * The microphone: a deep teal disc with a light ring. While listening it turns coral — the voice is live — and
 * ripples spread from it like rings on water.
 */
export function MicButton({ listening, busy, disabled, onClick, size = 'lg' }: MicButtonProps) {
  const { t } = useTranslation()
  const dimension = size === 'lg' ? 'size-24' : 'size-18'
  return (
    <div className="relative inline-grid place-items-center">
      {listening && (
        <>
          <span aria-hidden className={cn('absolute rounded-full bg-(--coral-bright)/30 animate-breathe', dimension)} />
          <span aria-hidden className={cn('absolute rounded-full bg-(--coral-bright)/20 animate-breathe [animation-delay:1.3s]', dimension)} />
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        aria-pressed={listening}
        aria-label={listening ? t('speech.stop') : t('speech.speak')}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full',
          'shadow-[0_0_0_6px_color-mix(in_oklab,var(--primary)_14%,transparent),0_18px_36px_-16px_rgb(6_54_58/0.8)] transition-[transform,background-color] duration-200 active:scale-95 disabled:opacity-50',
          dimension,
          listening ? 'bg-(--coral-bright) text-(--on-coral)' : 'bg-primary text-on-primary hover:bg-primary-hover',
        )}
      >
        {/* Inner light ring (a span, so the focus outline stays free). */}
        <span aria-hidden className="absolute inset-[5px] rounded-full border border-white/30" />
        {listening ? (
          <Icon name="stop" size={size === 'lg' ? 34 : 28} tone="plain" fillOpacity={1} />
        ) : (
          <Icon name="microphone" size={size === 'lg' ? 46 : 36} fillOpacity={0.9} />
        )}
      </button>
    </div>
  )
}
