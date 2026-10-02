import { describe, expect, it } from 'vitest'
import { tabOf } from './tabs'

describe('tabOf', () => {
  it('maps every screen to its tab', () => {
    expect(tabOf('/')).toBe('home')
    expect(tabOf('/conversations')).toBe('conversations')
    expect(tabOf('/conversations/cafe')).toBe('conversations')
    expect(tabOf('/progress')).toBe('progress')
    expect(tabOf('/settings')).toBe('settings')
    expect(tabOf('/settings/mic-test')).toBe('settings')
    expect(tabOf('/settings/data')).toBe('settings')
  })

  it('does not match a mere prefix or an unknown screen', () => {
    expect(tabOf('/conversationsx')).toBeNull()
    expect(tabOf('/play/abc')).toBeNull()
  })
})
