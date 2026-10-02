import type { IconName } from '@/components/icons/Icon'
import type { PracticeMode } from '@/domain/mastery'

/** The icon of each way through a conversation. */
export const MODE_ICON: Record<PracticeMode, IconName> = { read: 'eye', prompt: 'text-aa', recall: 'brain' }
