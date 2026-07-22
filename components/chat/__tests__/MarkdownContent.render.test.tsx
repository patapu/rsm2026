// @vitest-environment jsdom

/**
 * components/chat/__tests__/MarkdownContent.render.test.tsx
 *
 * Exercises the rich chat blocks through the REAL markdown pipeline —
 * `<ReactMarkdown components={markdownComponents}>` fed a fenced code block
 * string, exactly how `ChatMessage` uses it — rather than rendering the
 * block components in isolation. This is the only way to catch the subtle
 * `pre`/`code` unwrapping interaction the implementation depends on.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import ReactMarkdown from 'react-markdown'
import { markdownComponents } from '../MarkdownContent'

afterEach(() => cleanup())

function fence(lang: string, body: string): string {
  return '```' + lang + '\n' + body + '\n```'
}

describe('rich chat blocks through the real markdown pipeline', () => {
  it('resume-description renders a real <dl> with the expected term/detail pairs', () => {
    const md = fence(
      'resume-description',
      JSON.stringify({
        title: 'Skills',
        items: [
          { term: 'React', detail: '5 years' },
          { term: 'Node', detail: '4 years' },
        ],
      }),
    )
    const { container } = render(
      <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>,
    )
    const dl = container.querySelector('dl')
    expect(dl).not.toBeNull()
    expect(dl!.querySelectorAll('dt')).toHaveLength(2)
    expect(dl!.querySelectorAll('dd')).toHaveLength(2)
    expect(dl!.textContent).toContain('React')
    expect(dl!.textContent).toContain('5 years')
  })

  it('resume-table renders a real <table> with correct row/col counts', () => {
    const md = fence(
      'resume-table',
      JSON.stringify({
        columns: ['Company', 'Role', 'Years'],
        rows: [
          ['Acme', 'Engineer', '3'],
          ['Globex', 'Lead', '2'],
        ],
      }),
    )
    const { container } = render(
      <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>,
    )
    const table = container.querySelector('table')
    expect(table).not.toBeNull()
    expect(table!.querySelectorAll('thead th')).toHaveLength(3)
    expect(table!.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(table!.querySelectorAll('tbody tr')[0].querySelectorAll('td')).toHaveLength(3)
  })

  it.each(['bar', 'level', 'timeline', 'radar'])(
    'resume-chart (%s) renders an <svg role="img"> with a non-empty <title>',
    (kind) => {
      const payloads: Record<string, unknown> = {
        bar: { kind: 'bar', series: [{ label: 'A', value: 5 }] },
        level: { kind: 'level', items: [{ label: 'A', value: 80 }] },
        timeline: {
          kind: 'timeline',
          items: [{ label: 'A', start: '2020-01', end: 'present' }],
        },
        radar: {
          kind: 'radar',
          axes: ['a', 'b', 'c'],
          series: [{ label: 'S1', values: [10, 20, 30] }],
        },
      }
      const md = fence('resume-chart', JSON.stringify(payloads[kind]))
      const { container } = render(
        <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>,
      )
      const svg = container.querySelector('svg[role="img"]')
      expect(svg).not.toBeNull()
      const title = svg!.querySelector('title')
      expect(title).not.toBeNull()
      expect(title!.textContent).toBeTruthy()
      expect(title!.textContent!.length).toBeGreaterThan(0)
    },
  )

  it('a malformed resume-table payload falls back to a <pre> code block and does not throw', () => {
    const md = fence('resume-table', '{not valid json,,,')
    expect(() =>
      render(<ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>),
    ).not.toThrow()
    const { container } = render(
      <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>,
    )
    const pre = container.querySelector('pre')
    expect(pre).not.toBeNull()
    expect(pre!.querySelector('code')).not.toBeNull()
    expect(container.querySelector('table')).toBeNull()
    expect(container.querySelector('dl')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('a schema-violating resume-chart payload (radar axes/values mismatch) falls back to <pre>, does not throw', () => {
    const md = fence(
      'resume-chart',
      JSON.stringify({ kind: 'radar', axes: ['a', 'b', 'c'], series: [{ label: 'S1', values: [1, 2] }] }),
    )
    expect(() =>
      render(<ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>),
    ).not.toThrow()
    const { container } = render(
      <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>,
    )
    expect(container.querySelector('pre')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('a plain ```js fenced block is still rendered as an ordinary code block (no regression)', () => {
    const md = fence('js', 'const x = 1;')
    const { container } = render(
      <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>,
    )
    const pre = container.querySelectorAll('pre')
    expect(pre).toHaveLength(1)
    const code = pre[0].querySelector('code')
    expect(code).not.toBeNull()
    expect(code!.textContent).toContain('const x = 1;')
    // Not treated as a rich block — no resume-* semantic output leaked in.
    expect(container.querySelector('dl')).toBeNull()
    expect(container.querySelector('table')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('a fenced block with info string "resume-chart-foo" is NOT treated as a chart (tightened fence regex)', () => {
    // The fence regex requires the resume-* lang to be followed by
    // whitespace or end-of-string (`(?=\s|$)`), so a lang that merely
    // starts with "resume-chart" but continues with more characters must
    // fall through to an ordinary code block, not the chart renderer.
    const md = fence('resume-chart-foo', JSON.stringify({ kind: 'bar', series: [{ label: 'A', value: 1 }] }))
    const { container } = render(
      <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>,
    )
    const pre = container.querySelectorAll('pre')
    expect(pre).toHaveLength(1)
    expect(pre[0].querySelector('code')).not.toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('dl')).toBeNull()
    expect(container.querySelector('table')).toBeNull()
  })

  it.each(['resume-description', 'resume-table', 'resume-chart'])(
    'a valid %s block is NOT wrapped in <pre> (the pre override unwraps it)',
    (lang) => {
      const payloads: Record<string, unknown> = {
        'resume-description': { items: [{ term: 'A', detail: 'B' }] },
        'resume-table': { columns: ['A'], rows: [['1']] },
        'resume-chart': { kind: 'bar', series: [{ label: 'A', value: 1 }] },
      }
      const md = fence(lang, JSON.stringify(payloads[lang]))
      const { container } = render(
        <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>,
      )
      expect(container.querySelector('pre')).toBeNull()
    },
  )
})
