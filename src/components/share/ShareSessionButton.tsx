import { useTranslation } from 'react-i18next'
import type { ButtonSize, ButtonVariant } from '@/components/ui/buttonClasses'
import type { CharacterId } from '@/domain/types'
import { ShareButton } from './ShareButton'
import { sessionShareText, type SessionShare } from './shareText'

/** "Share your result" after a conversation: its title, lines said, first-try rate, points, streak and stars. */
export function ShareSessionButton({
  session,
  character,
  variant,
  size,
  block,
  className,
}: {
  session: SessionShare
  character: CharacterId
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language)
  const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return (
    <ShareButton
      className={className}
      label={t('share.sessionButton')}
      character={character}
      variant={variant}
      size={size}
      block={block}
      payload={{
        text: sessionShareText(session, t),
        fileName: t('share.sessionFileName'),
        card: {
          eyebrow: date,
          title: session.title,
          stats: [
            { value: `${session.accepted}/${session.total}`, label: t('share.cardLines') },
            { value: `${Math.round(session.firstTryRate * 100)}%`, label: t('share.cardFirstTry') },
            { value: `+${number.format(session.xp)}`, label: t('share.cardPoints') },
            { value: String(session.streak), label: t('share.cardStreak') },
          ],
          note: t('share.cardStars', { count: session.stars }),
        },
      }}
    />
  )
}
