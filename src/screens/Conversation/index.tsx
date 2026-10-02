import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { Avatar } from '@/components/brand/Avatar'
import { Icon } from '@/components/icons/Icon'
import { MODE_ICON } from '@/components/modeIcon'
import { Stars } from '@/components/Stars'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { DIALOGUES, dialogueTextId } from '@/content/dialogues'
import { learningLang, nativeLang, parseGloss, userLines } from '@/domain/dialogue'
import { nextMode, PRACTICE_MODES, type PracticeMode } from '@/domain/mastery'
import { cn } from '@/lib/cn'
import { RoleLegend } from '@/screens/Player/RoleLegend'
import { startDialogue } from '@/services/dialogues'
import { RunError } from '@/services/runs'
import { db } from '@/db/schema'
import { useAppSettings } from '@/stores/settings'
import { toast } from '@/stores/ui'

/** One conversation: the scene, its partner, its stars, the three ways through it and the learner's lines. */
export default function Conversation() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { key } = useParams()
  const { uiLang } = useAppSettings()
  const target = learningLang(uiLang)
  const native = nativeLang(target, uiLang)
  const dialogue = DIALOGUES.find((d) => d.key === key)
  const stats = useLiveQuery(async () => (dialogue ? ((await db.textStats.get(dialogueTextId(dialogue.key, target))) ?? null) : null), [dialogue, target])
  const [starting, setStarting] = useState<PracticeMode | null>(null)
  const [showLines, setShowLines] = useState(false)

  if (!dialogue) {
    return (
      <>
        <PageHeader backTo="/conversations" title={t('conversation.notFound')} />
        <EmptyState title={t('conversation.notFound')} action={<ButtonLink to="/conversations">{t('course.back')}</ButtonLink>} />
      </>
    )
  }
  if (stats === undefined) return null
  const stars = stats?.stars ?? []
  const recommended = nextMode(stars)
  const partner = t(`characters.${dialogue.partner}`)

  const begin = async (mode: PracticeMode) => {
    setStarting(mode)
    try {
      const run = await startDialogue(dialogue.key, mode)
      navigate(`/play/${run.id}`)
    } catch (error) {
      if (!(error instanceof RunError)) throw error
      toast({ kind: 'error', title: t('conversation.startError') })
      setStarting(null)
    }
  }

  return (
    <>
      <PageHeader
        backTo="/conversations"
        eyebrow={t('conversation.level', { level: dialogue.level })}
        title={dialogue.title[uiLang]}
        subtitle={
          <span lang={target} className="font-display italic">
            {dialogue.title[target]}
          </span>
        }
      />

      <Card framed className="flex items-center gap-4 animate-rise">
        <Avatar id={dialogue.partner} size={64} decorative />
        <div className="min-w-0 flex-1">
          <p className="text-ink">{dialogue.scene[uiLang]}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {t('conversation.with', { name: partner })} · {t('conversation.lines', { count: userLines(dialogue).length })}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars stars={stars} size={20} />
            {(stats?.repetitions ?? 0) > 0 && <span className="text-sm text-ink-soft">{t('conversation.done', { count: stats?.repetitions ?? 0 })}</span>}
          </div>
        </div>
      </Card>

      <section aria-labelledby="ways" className="mt-8">
        <h2 id="ways" className="mb-3 text-2xl font-semibold">
          {t('conversation.waysTitle')}
        </h2>
        <ul className="space-y-3">
          {PRACTICE_MODES.map((mode) => {
            const earned = stars.includes(mode)
            const suggested = mode === recommended
            return (
              <li key={mode}>
                <div className={cn('card p-4', suggested && 'card-hero border-primary')}>
                  <div className="flex items-center gap-3">
                    <span className={cn('disc', suggested ? 'disc-sea' : 'disc-sunk')} style={{ width: 44, height: 44 }}>
                      <Icon name={MODE_ICON[mode]} size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-display text-lg font-semibold">
                        {t(`modes.${mode}.name`)}
                        <Icon
                          name="star"
                          size={16}
                          tone={earned ? 'accent' : 'none'}
                          fillOpacity={earned ? 1 : 0}
                          className={earned ? 'text-gold-ink' : 'text-line-strong'}
                          label={earned ? t('conversation.starEarned') : t('conversation.starOpen')}
                        />
                      </p>
                      {suggested && <p className="text-xs font-bold tracking-wide text-primary uppercase">{t('conversation.suggested')}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant={suggested ? 'primary' : 'secondary'}
                      icon="play"
                      iconFill
                      disabled={starting !== null}
                      onClick={() => void begin(mode)}
                      aria-label={t('conversation.startWay', { mode: t(`modes.${mode}.name`) })}
                    >
                      {t('conversation.start')}
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{t(`modes.${mode}.desc`)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="lines" className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="lines" className="text-2xl font-semibold">
            {t('conversation.yourLines')}
          </h2>
          <Button size="sm" variant="ghost" aria-expanded={showLines} onClick={() => setShowLines((open) => !open)} iconEnd={showLines ? 'caret-up' : 'caret-down'}>
            {showLines ? t('common.hide') : t('common.show')}
          </Button>
        </div>
        {showLines && (
          <ol className="mt-3 space-y-2">
            {userLines(dialogue).map((index) => {
              const line = dialogue.lines[index]!
              return (
                <li key={index} className="card p-4">
                  <p lang={target} className="font-display text-lg text-ink">
                    {parseGloss(line.text[target]).plain}
                  </p>
                  {line.say?.[target] && (
                    <p lang={native} className="mt-1 text-sm text-ink-soft italic">
                      {line.say[target]}
                    </p>
                  )}
                  <p lang={native} className="mt-1 text-sm text-ink-soft">
                    {parseGloss(line.text[native]).plain}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <Card className="mt-8 space-y-3">
        <RoleLegend />
        <div className="divider" />
        <p className="flex items-start gap-2 text-sm text-ink-soft">
          <Icon name="ear" size={18} className="mt-0.5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold text-ink">{t('conversation.howToReadTitle')}</span> {t('conversation.howToRead')}
          </span>
        </p>
      </Card>
    </>
  )
}
