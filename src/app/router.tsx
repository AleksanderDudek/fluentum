import type { ComponentType } from 'react'
import { createHashRouter, type RouteObject } from 'react-router'
import { NotFound, RouteError } from './RouteError'
import { Root } from './Root'
import { TabsLayout } from './TabsLayout'

/** Route modules are code-split; each screen folder default-exports its component. */
const screen = (load: () => Promise<{ default: ComponentType }>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load()).default }),
})

export const routes: RouteObject[] = [
  {
    element: <Root />,
    errorElement: <RouteError />,
    // Shown while the first lazy screen loads: the same splash as index.html.
    hydrateFallbackElement: (
      <div className="boot" aria-hidden>
        <span>FLUENTUM</span>
      </div>
    ),
    children: [
      {
        element: <TabsLayout />,
        children: [
          { index: true, ...screen(() => import('@/screens/Home')) },
          { path: 'conversations', ...screen(() => import('@/screens/Conversations')) },
          { path: 'conversations/:key', ...screen(() => import('@/screens/Conversation')) },
          { path: 'progress', ...screen(() => import('@/screens/Progress')) },
          { path: 'settings', ...screen(() => import('@/screens/Settings')) },
          { path: 'settings/mic-test', ...screen(() => import('@/screens/MicTest')) },
          { path: 'settings/data', ...screen(() => import('@/screens/Data')) },
        ],
      },
      { path: 'play/:runId', ...screen(() => import('@/screens/Player')) },
      { path: 'play/:runId/summary', ...screen(() => import('@/screens/Summary')) },
      { path: 'onboarding', ...screen(() => import('@/screens/Onboarding')) },
      { path: 'friend', ...screen(() => import('@/screens/Friend')) },
      { path: '*', element: <NotFound /> },
    ],
  },
]

export const createAppRouter = () => createHashRouter(routes)
