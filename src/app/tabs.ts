import type { IconName } from '@/components/icons/Icon'

export type TabKey = 'home' | 'conversations' | 'progress' | 'settings'

export const TABS: ReadonlyArray<{ to: string; key: TabKey; icon: IconName; also?: readonly string[] }> = [
  { to: '/', key: 'home', icon: 'house-simple' },
  { to: '/conversations', key: 'conversations', icon: 'chats-circle' },
  { to: '/progress', key: 'progress', icon: 'chart-line-up' },
  { to: '/settings', key: 'settings', icon: 'gear-six' },
]

const within = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`)

/** The tab a screen belongs to — its own section, or the one it is reached from; null when none. */
export function tabOf(pathname: string): TabKey | null {
  if (pathname === '/' || pathname === '') return 'home'
  const tab = TABS.find(({ to, also = [] }) => to !== '/' && [to, ...also].some((root) => within(pathname, root)))
  return tab?.key ?? null
}

/** Route `handle` flags read by the tab layout. */
export interface RouteHandle {
  /** An editing form: the tab bar and the support panel step aside for the task. */
  form?: boolean
}
