import { Fragment, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Character } from '@/components/brand/Character'
import { CharacterPicker } from '@/components/brand/CharacterPicker'
import { Lori, type LoriMood } from '@/components/brand/Lori'
import { GuideBubble } from '@/components/brand/GuideBubble'
import { Icon } from '@/components/icons/Icon'
import { MicButton } from '@/components/speech/MicButton'
import { speechVendor } from '@/components/speech/vendor'
import { MODE_ICON } from '@/components/modeIcon'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { IconDisc } from '@/components/ui/IconDisc'
import { Pool } from '@/components/ui/Pool'
import { Segmented } from '@/components/ui/Segmented'
import { Stepper } from '@/components/ui/Stepper'
import { learningLang } from '@/domain/dialogue'
import { PRACTICE_MODES } from '@/domain/mastery'
import { COVERAGE_LADDER, evaluate } from '@/domain/matcher'
import { SPEECH_LANG, type Lang } from '@/domain/types'
import { useSpeechEngine } from '@/hooks/useSpeechEngine'
import { useTapCapture } from '@/hooks/useTapCapture'
import { cn } from '@/lib/cn'
import { requestPersistentStorage } from '@/services/backup'
import { DAILY_GOAL, updateAppSettings } from '@/services/settings'
import { useAppSettings } from '@/stores/settings'

const STEPS = 5

/** A centred step: Lori (or a portrait), a title and a line of body text. */
function Lead({ figure, title, body }: { figure: ReactNode; title: string; body?: ReactNode }) {
  return (
    <>
      {figure}
      <h1 id="step-title" className="mt-4 text-center text-[1.9rem] leading-[1.1] font-semibold">
        {title}
      </h1>
      {body && <p className="mx-auto mt-2 max-w-[22rem] text-center text-ink-soft">{body}</p>}
    </>
  )
}

function MicStep({ lang, onHeard }: { lang: Lang; onHeard: () => void }) {
  const { t } = useTranslation()
  const engineState = useSpeechEngine(SPEECH_LANG[lang])
  const engine = engineState.status === 'ready' ? engineState.engine : null
  const phrase = t('onboarding.micPhrase')
  const [verdict, setVerdict] = useState<'ok' | 'retry' | null>(null)
  const capture = useTapCapture({
    engine,
    lang: SPEECH_LANG[lang],
    onResult: (speech) => {
      // A microphone check, not a test: the most forgiving rung of the coverage ladder.
      const ok = evaluate(phrase, speech.alternatives, { lang, threshold: COVERAGE_LADDER.at(-1) }).accepted
      setVerdict(ok ? 'ok' : 'retry')
      if (ok) onHeard()
    },
  })
  const vendor = t(`speech.privacy.vendor${speechVendor()}`)
  const mood: LoriMood = verdict === 'ok' ? 'celebrate' : verdict === 'retry' ? 'encourage' : 'listen'
  return (
    <div className="flex flex-col items-center text-center">
      <Lead
        figure={<Lori mood={mood} size={180} decorative />}
        title={t('onboarding.micTitle')}
        body={verdict === 'ok' ? t('onboarding.micOk') : t('onboarding.micBody')}
      />
      <p lang={lang} className="spoken glow mt-3 w-full py-2.5">
        {phrase}
      </p>
      <div className="mt-2">
        <MicButton listening={capture.phase === 'listening'} busy={capture.phase === 'starting' || capture.phase === 'stopping'} disabled={!engine} onClick={capture.toggle} />
      </div>
      <p aria-live="polite" className={cn('mt-4 min-h-6 font-semibold', verdict === 'ok' ? 'text-ok' : 'text-near')}>
        {verdict === 'retry' ? t('onboarding.micRetry') : verdict === 'ok' ? '' : capture.transcript}
      </p>
      {(capture.error || engineState.status === 'unsupported') && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {t(`speech.errors.${capture.error ?? 'not-supported'}`)}
        </p>
      )}
      {/* Say who processes the audio before the microphone is used for the first time. */}
      <p className="mt-4 flex gap-3 rounded-2xl border border-line bg-surface p-4 text-left text-sm text-ink-soft">
        <Icon name="shield-check" size={20} className="mt-0.5 text-primary" />
        <span>
          {t('speech.privacy.body', { vendor })} {engineState.status === 'ready' && engineState.onDevice && t('speech.privacy.onDevice')}
        </span>
      </p>
    </div>
  )
}

export default function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const app = useAppSettings()
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState(app.dailyGoal)
  const [busy, setBusy] = useState(false)
  const target = learningLang(app.uiLang)

  const finish = async () => {
    setBusy(true)
    await updateAppSettings({ dailyGoal: goal, onboardingCompleted: true })
    void requestPersistentStorage()
    navigate('/', { replace: true })
  }

  const steps: ReactNode[] = [
    // 1 · welcome and the language pair (taken from the browser; the learner can correct it here)
    <Fragment key="welcome">
      <Lead
        figure={
          <Pool glow className="px-3 pt-6 pb-4">
            <Lori mood="welcome" size={200} decorative className="mx-auto" />
          </Pool>
        }
        title={t('onboarding.welcomeTitle')}
        body={t('onboarding.welcomeBody')}
      />
      <div className="card mt-5 p-4">
        <Segmented<Lang>
          label={t('onboarding.speakLabel')}
          value={app.uiLang}
          options={[
            { value: 'pl', label: 'Polski' },
            { value: 'en', label: 'English' },
          ]}
          onChange={(uiLang) => void updateAppSettings({ uiLang })}
        />
        <p className="mt-3 flex items-center gap-2 font-medium text-ink">
          <Icon name="translate" size={20} className="text-primary" />
          {t(`onboarding.learning.${target}`)}
        </p>
      </div>
    </Fragment>,
    // 2 · how a conversation goes, and the three stars
    <Fragment key="how">
      <h1 id="step-title" className="sr-only">
        {t('onboarding.howTitle')}
      </h1>
      <GuideBubble mood="teach" size={96} compact>
        {t('onboarding.howGuide')}
      </GuideBubble>
      <ol className="mt-4 space-y-2.5">
        {(['partner', 'answer', 'check'] as const).map((key, index) => (
          <li key={key} className="card flex items-center gap-3.5 p-3.5">
            <span className="disc disc-sea size-9 font-display font-semibold">{index + 1}</span>
            <span className="flex-1 text-[0.95rem]">{t(`onboarding.how.${key}`)}</span>
          </li>
        ))}
      </ol>
      <h2 className="mt-5 mb-2 text-lg font-semibold">{t('onboarding.starsTitle')}</h2>
      <ul className="grid gap-2">
        {PRACTICE_MODES.map((mode) => (
          <li key={mode} className="flex items-start gap-3 rounded-2xl bg-surface/70 p-3">
            <IconDisc icon={MODE_ICON[mode]} size={38} iconSize={20} />
            <span className="text-sm">
              <span className="block font-semibold text-ink">{t(`modes.${mode}.name`)}</span>
              <span className="block text-ink-soft">{t(`modes.${mode}.short`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Fragment>,
    // 3 · the figure that stands for the user
    <Fragment key="character">
      <h1 id="step-title" className="sr-only">
        {t('onboarding.characterTitle')}
      </h1>
      <GuideBubble mood="point" size={96} compact>
        {t('onboarding.characterGuide')}
      </GuideBubble>
      <div className="mt-4 flex justify-center">
        <Pool glow className="w-[180px] px-2 pt-4">
          <Character id={app.character} wave size={160} decorative />
        </Pool>
      </div>
      <div className="mt-4">
        <CharacterPicker label={t('onboarding.characterTitle')} hideLabel value={app.character} onChange={(character) => void updateAppSettings({ character })} />
      </div>
    </Fragment>,
    // 4 · microphone test, in the language being learnt
    <MicStep key="mic" lang={target} onHeard={() => void updateAppSettings({ speechPrivacyAcknowledged: true })} />,
    // 5 · daily goal
    <div key="goal" className="flex flex-col items-center">
      <Lead figure={<Lori mood="encourage" size={180} decorative />} title={t('onboarding.goalTitle')} body={t('onboarding.goalBody')} />
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {[5, 10, 20, 30].map((preset) => (
          <Chip key={preset} pressed={goal === preset} onClick={() => setGoal(preset)}>
            {t('onboarding.goalLines', { count: preset })}
          </Chip>
        ))}
      </div>
      <div className="mt-4">
        <Stepper label={t('settings.dailyGoal')} value={goal} min={DAILY_GOAL.min} max={DAILY_GOAL.max} onChange={setGoal} />
      </div>
      <p className="mt-4 flex items-center gap-2 text-center text-sm font-medium text-gold-ink">
        <Icon name="sparkle" size={16} />
        {t('golden.hint')}
      </p>
      <p className="mt-5 flex items-center gap-2 text-center text-[0.8rem] text-ink-soft">
        <Icon name="shield-check" size={16} className="text-primary" />
        <span>
          {t('onboarding.privacyNote')}{' '}
          <a className="font-semibold text-primary underline underline-offset-4" href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noreferrer">
            {t('onboarding.privacyLink')}
          </a>
        </span>
      </p>
    </div>,
  ]
  const last = step === STEPS - 1

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{t('onboarding.step', { current: step + 1, total: STEPS })}</p>
        <Button variant="ghost" size="sm" onClick={() => void finish()} disabled={busy}>
          {t('onboarding.skip')}
        </Button>
      </div>

      <section key={step} className="flex-1 pt-3 animate-rise" aria-labelledby="step-title">
        {steps[step]}
      </section>

      <div className="mt-6 flex flex-col items-center gap-3.5">
        <div className="flex gap-2" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                'size-2.5 rounded-full transition-colors',
                i === step ? 'bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]' : i < step ? 'bg-primary/60' : 'bg-line-strong',
              )}
            />
          ))}
        </div>
        <div className="flex w-full gap-2.5">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)}>
              {t('onboarding.back')}
            </Button>
          )}
          <Button
            size="lg"
            block
            disabled={busy}
            iconEnd={last ? undefined : 'caret-right'}
            onClick={() => (last ? void finish() : setStep((s) => s + 1))}
          >
            {step === 0 ? t('onboarding.start') : last ? t('onboarding.begin') : t('onboarding.next')}
          </Button>
        </div>
      </div>
    </main>
  )
}
