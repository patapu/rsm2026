/**
 * Tests for `hideIncompleteResumeBlock` — the guard that keeps a half-streamed
 * rich block (```resume-chart / resume-table / resume-description) from being
 * rendered as raw JSON while it is still arriving.
 */
import { describe, it, expect } from 'vitest'
import { hideIncompleteResumeBlock } from '../streamingMarkdown'

describe('hideIncompleteResumeBlock', () => {
  it('leaves plain prose untouched', () => {
    const text = 'สวัสดีครับ **ยินดี** ที่ได้รู้จัก'
    expect(hideIncompleteResumeBlock(text)).toBe(text)
  })

  it('leaves a COMPLETED resume block untouched', () => {
    const text = 'ก่อนหน้า\n\n```resume-table\n{"rows":[]}\n```\n\nหลังจาก'
    expect(hideIncompleteResumeBlock(text)).toBe(text)
  })

  it('truncates at an unclosed resume fence', () => {
    const text = 'ทักษะหลักครับ\n\n```resume-chart\n{"kind":"bar","dat'
    expect(hideIncompleteResumeBlock(text)).toBe('ทักษะหลักครับ\n\n')
  })

  it('hides only the trailing block when an earlier one is complete', () => {
    const text = '```resume-table\n{}\n```\nต่อไป\n```resume-chart\n{"kind"'
    expect(hideIncompleteResumeBlock(text)).toBe('```resume-table\n{}\n```\nต่อไป\n')
  })

  it('leaves an unclosed PLAIN code fence alone — partial code still reads fine', () => {
    const text = 'ตัวอย่าง:\n\n```ts\nconst a = 1'
    expect(hideIncompleteResumeBlock(text)).toBe(text)
  })

  it('hides the fence when the language alias is used', () => {
    const text = 'ดูกราฟ\n```resume-level\n{"items"'
    expect(hideIncompleteResumeBlock(text)).toBe('ดูกราฟ\n')
  })

  it('hides a fence opened on the very first line', () => {
    expect(hideIncompleteResumeBlock('```resume-description\n{')).toBe('')
  })

  it('is a no-op on empty input', () => {
    expect(hideIncompleteResumeBlock('')).toBe('')
  })
})
